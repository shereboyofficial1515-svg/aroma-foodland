// Operational error class. Throw this (or subclass patterns) anywhere in
// controllers/services for expected failure cases — the global error
// handler in middleware/errorHandler.js turns it into a safe JSON response
// and never leaks stack traces or raw DB errors to the client.
class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Wraps an async route handler so rejected promises reach the error
// middleware instead of crashing the process or hanging the request.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = { AppError, asyncHandler };
