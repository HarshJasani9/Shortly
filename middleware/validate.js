const { validationResult } = require('express-validator');

// Middleware to handle and format express-validator errors
const validate = (req, res, next) => {
  // Extract validation errors from the request
  const errors = validationResult(req);
  
  // If there are errors, return a 422 Unprocessable Entity
  if (!errors.isEmpty()) {
    // Format the errors array to exactly match what the client expects:
    // { errors: [{ field: "fieldName", message: "Error message" }] }
    const formattedErrors = errors.array().map(err => ({
      field: err.path || err.param, // Express-validator v7+ uses 'path', older uses 'param'
      message: err.msg
    }));
    
    return res.status(422).json({ errors: formattedErrors });
  }
  
  // If no errors, pass control to the next middleware or controller
  next();
};

module.exports = validate;
