// Global error handling middleware
// Express recognizes this as an error handler because it has 4 parameters (err, req, res, next)
const errorHandler = (err, req, res, next) => {
  // Log the error stack to the console for debugging
  console.error(err.stack);

  // Determine the status code. If the error doesn't have a status code, default to 500 (Internal Server Error)
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Set the response status code and return a clean JSON error response
  res.status(statusCode).json({
    message: err.message || 'Internal Server Error',
    // In production, you wouldn't send the stack trace to the client for security reasons
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

// Export the middleware so it can be registered in server.js
module.exports = errorHandler;
