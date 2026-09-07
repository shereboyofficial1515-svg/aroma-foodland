const crypto = require('crypto');
const { env } = require('../config/env');
const { AppError } = require('../utils/AppError');

const PAYSTACK_BASE = 'https://api.paystack.co';

function assertConfigured() {
  if (!env.paystack.enabled) {
    throw new AppError('Online payment is not configured yet. Please contact the restaurant to complete your order.', 503, 'PAYSTACK_NOT_CONFIGURED');
  }
}

// Initializes a transaction. Amount must be in kobo (Paystack's smallest unit).
async function initializeTransaction({ email, amountNaira, reference, metadata, callbackUrl }) {
  assertConfigured();

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.paystack.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: Math.round(amountNaira * 100),
      reference,
      currency: 'NGN',
      callback_url: callbackUrl,
      metadata,
    }),
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new AppError('Could not initialize payment. Please try again.', 502, 'PAYSTACK_INIT_FAILED');
  }
  return json.data; // { authorization_url, access_code, reference }
}

// Verifies a transaction by reference — the ONLY source of truth for
// whether a payment actually succeeded. Never trust a frontend redirect
// query param claiming success on its own.
async function verifyTransaction(reference) {
  assertConfigured();

  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${env.paystack.secretKey}` },
  });

  const json = await res.json();
  if (!res.ok || !json.status) {
    throw new AppError('Could not verify payment with Paystack.', 502, 'PAYSTACK_VERIFY_FAILED');
  }
  return json.data; // { status: 'success'|'failed'|..., amount, reference, paid_at, channel, ... }
}

// Validates the `x-paystack-signature` header against the raw request body
// using HMAC-SHA512 with the secret key, per Paystack's webhook spec.
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!env.paystack.secretKey || !signatureHeader) return false;
  const hash = crypto.createHmac('sha512', env.paystack.secretKey).update(rawBody).digest('hex');
  return hash === signatureHeader;
}

module.exports = { initializeTransaction, verifyTransaction, verifyWebhookSignature };
