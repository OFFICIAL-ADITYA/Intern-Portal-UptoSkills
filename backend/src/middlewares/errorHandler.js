/**
 * Central Error Handler Middleware
 * Guarantees standard error shape: { message, errors? }
 * Removes internal error message leaks on 500 in production
 */
export const errorHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.status || err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  let message = err.message || 'An unexpected error occurred.';
  if (isProduction && statusCode === 500) {
    message = 'Internal server error';
  }

  const response = { message };

  // Handle express-validator errors or custom validation arrays
  if (err.errors && Array.isArray(err.errors)) {
    response.errors = err.errors;
  } else if (typeof err.array === 'function') {
    response.errors = err.array();
  }

  if (!isProduction && err.stack && statusCode === 500) {
    response.stack = err.stack;
  }

  return res.status(statusCode).json(response);
};

export default errorHandler;
