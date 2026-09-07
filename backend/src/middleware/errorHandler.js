const { env } = require('../config/env');

// Generic, customer-safe fallback messages by status code family.
function safeFallbackMessage(statusCode) {
  if (statusCode === 401) return 'You need to be signed in to do that.';
  if (statusCode === 403) return "You don't have permission to do that.";
  if (statusCode === 404) return 'We could not find what you were looking for.';
  if (statusCode === 429) return 'Too many requests. Please slow down and try again.';
  if (statusCode >= 500) return 'Something went wrong on our end. Please try again.';
  return 'Something went wrong. Please try again.';
}

// 404 handler — mounted after all routes.
function notFound(req, res, next) {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
}

// Global error handler — mounted last. Signature (err, req, res, next) is
// required by Express to recognize this as an error-handling middleware.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const isOperational = err.isOperational === true;
  const statusCode = err.statusCode && err.statusCode >= 400 ? err.statusCode : 500;
  const code = err.code || 'INTERNAL_ERROR';

  // Log full detail server-side (swap for a real logger/monitoring in prod).
  // eslint-disable-next-line no-console
  console.error(`[error] ${req.method} ${req.originalUrl} ->`, err);

  const message = isOperational ? err.message : safeFallbackMessage(statusCode);

  const body = { success: false, error: { code, message } };
  if (env.nodeEnv !== 'production' && !isOperational) {
    body.error.debug = { message: err.message, stack: err.stack };
  }

  res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
