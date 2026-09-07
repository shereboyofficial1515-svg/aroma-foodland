const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

// Helmet with a conservative default CSP. Tighten `connectSrc`/`imgSrc` to
// your real Supabase project domain and CDN(s) before going to production.
const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com', 'https://js.paystack.co'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", env.supabase.url, 'https://api.paystack.co'].filter(Boolean),
      frameSrc: ['https://js.paystack.co', 'https://checkout.paystack.com'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});

// General API rate limiter.
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' } },
});

// Stricter limiter for auth endpoints (login, register, password reset)
// to slow down brute-force and credential-stuffing attempts.
const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait before trying again.' } },
});

// Very strict limiter for payment initialization to blunt automated abuse.
const paymentLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many payment attempts. Please wait and try again.' } },
});

// Chat-specific limiter — a bit looser than auth but still protects
// against runaway costs from a single client hammering the AI endpoint.
const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'You are sending messages too quickly. Please slow down.' } },
});

module.exports = { helmetMiddleware, apiLimiter, authLimiter, paymentLimiter, aiChatLimiter };
