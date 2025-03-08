// Import Express to create a router
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import controllers and custom middleware
const { shortenUrl, redirectUrl, getAllUrls } = require('../controllers/urlController');
const validate = require('../middleware/validate');

// Initialize the Express router
const router = express.Router();

// Specific rate limiter for the shorten route
// Max 10 requests per 15 minutes per IP
const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Route to shorten a new URL
// Chain of middleware: Rate Limit -> express-validator rules -> custom validate handler -> controller logic
router.post(
  '/api/shorten',
  shortenLimiter,
  [
    // Validation rules for originalUrl
    body('originalUrl')
      .notEmpty().withMessage('originalUrl cannot be empty')
      .isURL({ require_protocol: true, protocols: ['http', 'https'] }).withMessage('Must be a valid URL starting with http:// or https://')
      .isLength({ max: 2048 }).withMessage('URL length cannot exceed 2048 characters')
  ],
  validate,
  shortenUrl
);

// Route to get all shortened URLs
router.get('/api/urls', getAllUrls);

// Route to redirect a short code to its original URL
// Placed last to act as a catch-all for dynamic :code params
router.get('/:code', redirectUrl);

module.exports = router;
