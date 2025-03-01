// Import the nanoid library to generate random short codes (using v3 for CommonJS support)
const { nanoid } = require('nanoid');
// Import the Url model to interact with the database
const Url = require('../models/Url');

// Helper function to validate if a string is a valid URL format
// It attempts to create a new URL object. If it throws, the URL is invalid.
const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * @desc    Shorten a long URL
 * @route   POST /api/shorten
 * @access  Public
 */
const shortenUrl = async (req, res, next) => {
  try {
    // Extract the originalUrl from the request body
    const { originalUrl } = req.body;

    // Validate the provided URL
    if (!originalUrl || !isValidUrl(originalUrl)) {
      res.status(400); // 400 Bad Request
      throw new Error('Invalid URL provided');
    }

    // Generate a unique 6-character short code
    const shortCode = nanoid(6);

    // Create a new URL document in the database
    const newUrl = await Url.create({
      originalUrl,
      shortCode,
    });

    // Construct the full short URL using the BASE_URL from environment variables
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const shortUrl = `${baseUrl}/${newUrl.shortCode}`;

    // Send back a success response with the original and short URL info
    res.status(201).json({
      originalUrl: newUrl.originalUrl,
      shortCode: newUrl.shortCode,
      shortUrl: shortUrl,
    });
  } catch (error) {
    // Pass any errors to the global error handler middleware
    next(error);
  }
};

/**
 * @desc    Redirect to the original URL
 * @route   GET /:code
 * @access  Public
 */
const redirectUrl = async (req, res, next) => {
  try {
    // Extract the short code from the URL parameters
    const { code } = req.params;

    // Find the URL document with the matching short code
    const urlDoc = await Url.findOne({ shortCode: code });

    // If no document is found, return a 404 error response
    if (!urlDoc) {
      res.status(404);
      throw new Error('Short URL not found');
    }

    // Increment the click counter by 1 to track analytics
    urlDoc.clicks++;
    
    // Save the updated document to the database
    await urlDoc.save();

    // Redirect the user to the original long URL with a 302 Found status
    res.redirect(urlDoc.originalUrl);
  } catch (error) {
    // Pass any errors to the global error handler middleware
    next(error);
  }
};

/**
 * @desc    Get all shortened URLs
 * @route   GET /api/urls
 * @access  Public
 */
const getAllUrls = async (req, res, next) => {
  try {
    // Fetch all URL documents from the database, sorted by newest first (-1)
    const urls = await Url.find().sort({ createdAt: -1 });

    // Send the list of URLs in the response
    res.status(200).json(urls);
  } catch (error) {
    // Pass any errors to the global error handler middleware
    next(error);
  }
};

// Export all the controller functions so they can be routed
module.exports = {
  shortenUrl,
  redirectUrl,
  getAllUrls,
};
