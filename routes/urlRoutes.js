// Import Express to create a router
const express = require('express');
// Import our controller functions
const { shortenUrl, redirectUrl, getAllUrls } = require('../controllers/urlController');

// Initialize the Express router
const router = express.Router();

// Route to shorten a new URL
// When a POST request is made to /api/shorten, the shortenUrl controller function runs
router.post('/api/shorten', shortenUrl);

// Route to get all shortened URLs
// When a GET request is made to /api/urls, the getAllUrls controller function runs
router.get('/api/urls', getAllUrls);

// Route to redirect a short code to its original URL
// The :code is a dynamic parameter that can be accessed via req.params.code
// This is placed last to prevent it from accidentally matching /api/... routes
router.get('/:code', redirectUrl);

// Export the router so it can be mounted in server.js
module.exports = router;
