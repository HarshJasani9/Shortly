// Global error handling middleware for formatting responses
const errorHandler = (err, req, res, next) => {
  // Make a copy of the error object to modify
  let error = { ...err };
  error.message = err.message;
  
  // Always log the original error for debugging (except in production if desired)
  if (process.env.NODE_ENV !== 'production') {
    console.error(err);
  }

  // Handle Mongoose cast error (e.g., invalid ObjectId structure)
  if (err.name === 'CastError') {
    error.message = 'Invalid ID format';
    error.statusCode = 400;
  }

  // Handle Mongoose duplicate key error (code 11000 - typically index collisions)
  if (err.code === 11000) {
    error.message = 'This short code already exists';
    error.statusCode = 409;
  }

  // Handle Mongoose validation errors (Schema requirement failures)
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error.message = message;
    error.statusCode = 400;
  }

  // Handle JWT errors (for future authentication functionality)
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    error.message = 'Not authorized';
    error.statusCode = 401;
  }

  // Determine final status code and message. Default to 500 if unset.
  const statusCode = error.statusCode || (res.statusCode === 200 ? 500 : res.statusCode) || 500;
  const message = error.message || 'Something went wrong';
  
  // Only expose the full stack trace in development mode
  const isDev = process.env.NODE_ENV === 'development';

  // Return the standardized JSON response wrapper
  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;
