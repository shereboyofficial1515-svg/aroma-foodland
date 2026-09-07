// Centralized, validated access to environment variables.
// Import this module instead of reading process.env directly elsewhere,
// so a missing required variable fails fast at startup with a clear message.

require('dotenv').config();

const required = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
];

function assertRequiredEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.error(
      `\n[config] Missing required environment variables: ${missing.join(', ')}\n` +
      `Copy backend/.env.example to backend/.env and fill in real values.\n`
    );
    process.exit(1);
  }
}

// Feature flags — allows the app to boot in a "not configured" state for
// optional integrations rather than crashing, per the "no fake functionality"
// rule: instead of pretending to work, endpoints return a clear
// "service not configured" error when a flag is false.
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5500',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',

  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  cookieSecret: process.env.COOKIE_SECRET || process.env.JWT_SECRET,

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || null,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || null,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || null,
    get enabled() {
      return Boolean(this.clientId && this.clientSecret);
    },
  },

  paystack: {
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || null,
    secretKey: process.env.PAYSTACK_SECRET_KEY || null,
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || null,
    get enabled() {
      return Boolean(this.secretKey);
    },
  },

  resend: {
    apiKey: process.env.RESEND_API_KEY || null,
    fromEmail: process.env.RESEND_FROM_EMAIL || null,
    get enabled() {
      return Boolean(this.apiKey);
    },
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || null,
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    get enabled() {
      return Boolean(this.apiKey);
    },
  },

  rateLimit: {
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.RATE_LIMIT_MAX) || 200,
    authMax: Number(process.env.AUTH_RATE_LIMIT_MAX) || 10,
  },
};

module.exports = { env, assertRequiredEnv };
