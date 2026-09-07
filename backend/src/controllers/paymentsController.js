const { v4: uuidv4 } = require('uuid');
const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const paystack = require('../services/paystackService');
const { confirmPaymentByReference } = require('../services/paymentService');
const { env } = require('../config/env');

// ---------------------------------------------------------------------------
// POST /api/v1/payments/initialize   { order_id }
// ---------------------------------------------------------------------------
const initialize = asyncHandler(async (req, res) => {
  const { order_id } = req.body;
  if (!order_id) throw new AppError('order_id is required.', 400, 'VALIDATION_ERROR');

  const { data: order } = await supabaseAdmin.from('orders').select('*').eq('id', order_id).single();
  if (!order) throw new AppError('Order not found.', 404, 'NOT_FOUND');
  if (order.user_id !== req.user.id) throw new AppError("You don't have permission to pay for this order.", 403, 'FORBIDDEN');
  if (order.status === 'cancelled') throw new AppError('This order has been cancelled.', 400, 'ORDER_CANCELLED');

  // Prevent duplicate payment rows / duplicate charge attempts: reuse an
  // existing pending payment's reference if one exists rather than creating
  // a new one each time the customer opens checkout again.
  const { data: existingPayment } = await supabaseAdmin.from('payments').select('*').eq('order_id', order_id).maybeSingle();

  if (existingPayment?.payment_status === 'paid') {
    throw new AppError('This order has already been paid for.', 409, 'ALREADY_PAID');
  }

  const reference = existingPayment?.payment_reference || `AFL-PAY-${uuidv4()}`;

  if (!existingPayment) {
    await supabaseAdmin.from('payments').insert({
      order_id,
      payment_reference: reference,
      amount: order.total,
      currency: 'NGN',
      payment_status: 'pending',
    });
  }

  const data = await paystack.initializeTransaction({
    email: order.customer_email,
    amountNaira: Number(order.total),
    reference,
    metadata: { order_id, order_number: order.order_number },
    callbackUrl: `${env.frontendUrl}/order-confirmation.html?ref=${reference}`,
  });

  res.json({ success: true, authorization_url: data.authorization_url, reference, public_key: env.paystack.publicKey });
});

// ---------------------------------------------------------------------------
// GET /api/v1/payments/verify/:reference — called by the frontend after
// Paystack redirects back. Always re-verifies against Paystack's API; never
// trusts the redirect alone.
// ---------------------------------------------------------------------------
const verify = asyncHandler(async (req, res) => {
  const { reference } = req.params;

  const { data: payment } = await supabaseAdmin.from('payments').select('*, orders(user_id)').eq('payment_reference', reference).single();
  if (!payment) throw new AppError('Payment record not found.', 404, 'NOT_FOUND');
  if (payment.orders.user_id !== req.user.id) throw new AppError("You don't have permission to view this payment.", 403, 'FORBIDDEN');

  const paystackData = await paystack.verifyTransaction(reference);
  const result = await confirmPaymentByReference(reference, paystackData);

  if (!result.success && !result.alreadyProcessed) {
    throw new AppError('Payment could not be verified. Please contact support if money was deducted.', 400, 'PAYMENT_VERIFICATION_FAILED');
  }

  res.json({ success: true, payment: result.payment, order: result.order });
});

// ---------------------------------------------------------------------------
// POST /api/v1/payments/webhook — Paystack server-to-server event.
// Mounted in app.js with express.raw() BEFORE the JSON body parser, so
// `req.body` here is a Buffer — required for signature verification.
// ---------------------------------------------------------------------------
const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const rawBody = req.body; // Buffer, thanks to express.raw() in app.js

  if (!paystack.verifyWebhookSignature(rawBody, signature)) {
    // Do not process; respond 401 so Paystack's dashboard shows the failure,
    // without revealing why (avoids helping an attacker calibrate signatures).
    return res.status(401).json({ success: false });
  }

  const event = JSON.parse(rawBody.toString('utf8'));

  if (event.event === 'charge.success') {
    await confirmPaymentByReference(event.data.reference, event.data);
  }

  // Always 200 quickly so Paystack doesn't retry-storm us; failures are
  // logged inside confirmPaymentByReference / caught by asyncHandler.
  res.status(200).json({ received: true });
});

module.exports = { initialize, verify, webhook };
