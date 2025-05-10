// Import Express to create a router
const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');

// Import controllers and custom middleware
const { shortenUrl, redirectUrl, getAllUrls } = require('../controllers/urlController');
const { getAnalytics, getRawAnalytics } = require('../controllers/analyticsController');
const validate = require('../middleware/validate');

// Initialize the Express router
const router = express.Router();

// Specific rate limiter for the shorten route
const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Route to shorten a new URL
router.post(
  '/api/shorten',
  shortenLimiter,
  [
    body('originalUrl')
      .notEmpty().withMessage('originalUrl cannot be empty')
      .isURL({ require_protocol: true, protocols: ['http', 'https'] }).withMessage('Must be a valid URL starting with http:// or https://')
      .isLength({ max: 2048 }).withMessage('URL length cannot exceed 2048 characters')
  ],
  validate,
  shortenUrl
);

// Analytics Routes
// We must place these BEFORE /:code otherwise Express will treat "analytics" as a shortCode!
router.get('/api/analytics/:code/raw', getRawAnalytics);
router.get('/api/analytics/:code', getAnalytics);

// Route to get all shortened URLs
router.get('/api/urls', getAllUrls);

// Route to redirect a short code to its original URL
router.get('/:code', redirectUrl);

module.exports = router;
