const { supabaseAdmin } = require('../config/supabase');
const { notify } = require('./notificationService');
const { sendEmail } = require('./emailService');
const templates = require('./emailTemplates');
const { recordAudit } = require('./auditService');

// Idempotently marks a payment as paid and confirms its order. Safe to call
// twice for the same reference (e.g. both the frontend verify call AND the
// Paystack webhook fire for the same transaction) — the second call is a
// no-op past the status check, so the customer never gets duplicate emails
// and the order is never double-processed.
async function confirmPaymentByReference(reference, paystackData) {
  const { data: payment } = await supabaseAdmin.from('payments').select('*, orders(*)').eq('payment_reference', reference).single();
  if (!payment) return { handled: false, reason: 'PAYMENT_NOT_FOUND' };

  if (payment.payment_status === 'paid') {
    return { handled: true, alreadyProcessed: true, payment, order: payment.orders };
  }

  const paystackSaysSuccess = paystackData.status === 'success';
  const amountMatches = Math.round(Number(payment.amount) * 100) === Number(paystackData.amount);

  if (!paystackSaysSuccess || !amountMatches) {
    await supabaseAdmin
      .from('payments')
      .update({ payment_status: 'failed', raw_webhook_payload: paystackData })
      .eq('id', payment.id);
    return { handled: true, success: false, payment, order: payment.orders };
  }

  const { data: updatedPayment } = await supabaseAdmin
    .from('payments')
    .update({
      payment_status: 'paid',
      transaction_id: String(paystackData.id || paystackData.reference),
      payment_method: paystackData.channel || 'card',
      paid_at: paystackData.paid_at || new Date().toISOString(),
      raw_webhook_payload: paystackData,
    })
    .eq('id', payment.id)
    .select()
    .single();

  const { data: updatedOrder } = await supabaseAdmin
    .from('orders')
    .update({ status: payment.orders.status === 'pending' ? 'confirmed' : payment.orders.status })
    .eq('id', payment.order_id)
    .select()
    .single();

  await notify({
    userId: updatedOrder.user_id,
    type: 'payment_successful',
    title: 'Payment successful',
    message: `We've received your payment for order #${updatedOrder.order_number}.`,
    metadata: { order_id: updatedOrder.id },
  });
  await notify({
    userId: updatedOrder.user_id,
    type: 'order_confirmed',
    title: 'Order confirmed',
    message: `Order #${updatedOrder.order_number} has been confirmed and sent to the kitchen.`,
    metadata: { order_id: updatedOrder.id },
  });

  const { data: orderItems } = await supabaseAdmin.from('order_items').select('*').eq('order_id', updatedOrder.id);

  await sendEmail({ to: updatedOrder.customer_email, subject: `Payment Received — #${updatedOrder.order_number}`, html: templates.paymentConfirmation(updatedOrder, updatedPayment) });
  await sendEmail({ to: updatedOrder.customer_email, subject: `Order Confirmed — #${updatedOrder.order_number}`, html: templates.orderConfirmation(updatedOrder, orderItems || []) });

  // Alert the restaurant's own inbox too, so staff notice a paid order even
  // before checking the admin dashboard — same pattern as the catering/hotel
  // booking and contact-form alerts.
  const { data: settings } = await supabaseAdmin.from('restaurant_settings').select('email').eq('id', 1).single();
  if (settings?.email) {
    await sendEmail({ to: settings.email, subject: `New Order — #${updatedOrder.order_number}`, html: templates.adminNewOrderAlert(updatedOrder, (orderItems || []).length) });
  }

  await recordAudit({ userId: updatedOrder.user_id, action: 'payment_confirmed', resourceType: 'payment', resourceId: updatedPayment.id, metadata: { order_id: updatedOrder.id, amount: updatedPayment.amount } });

  return { handled: true, success: true, payment: updatedPayment, order: updatedOrder };
}

module.exports = { confirmPaymentByReference };