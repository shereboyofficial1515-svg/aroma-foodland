const { AppError } = require('./AppError');

// Wraps a Zod schema into Express middleware. On failure, throws an
// AppError(400) with a readable message instead of a raw Zod error object —
// keeps validation failures consistent with the rest of the API's error shape.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues
        .map((issue) => `${issue.path.join('.') || source}: ${issue.message}`)
        .join('; ');
      return next(new AppError(message, 400, 'VALIDATION_ERROR'));
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
