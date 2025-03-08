const { nanoid } = require('nanoid');
const Url = require('../models/Url');

/**
 * @desc    Shorten a long URL
 * @route   POST /api/shorten
 * @access  Public
 */
const shortenUrl = async (req, res, next) => {
  try {
    const { originalUrl } = req.body;

    // We no longer need manual validation here because express-validator
    // runs before this controller and blocks invalid requests.

    // Generate a unique 6-character short code
    const shortCode = nanoid(6);

    // Create a new URL document in the database
    const newUrl = await Url.create({
      originalUrl,
      shortCode,
    });

    // Construct the full short URL using the BASE_URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const shortUrl = `${baseUrl}/${newUrl.shortCode}`;

    // Send success response
    res.status(201).json({
      originalUrl: newUrl.originalUrl,
      shortCode: newUrl.shortCode,
      shortUrl: shortUrl,
    });
  } catch (error) {
    // Pass unexpected errors to the global error handler
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
    const { code } = req.params;

    // Find the URL document
    const urlDoc = await Url.findOne({ shortCode: code });

    // If not found, manually trigger a 404 error
    if (!urlDoc) {
      res.status(404);
      throw new Error('Short URL not found');
    }

    // Increment analytics
    urlDoc.clicks++;
    await urlDoc.save();

    // Redirect to original URL
    res.redirect(urlDoc.originalUrl);
  } catch (error) {
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
    // Fetch all URLs sorted by newest
    const urls = await Url.find().sort({ createdAt: -1 });

    res.status(200).json(urls);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  shortenUrl,
  redirectUrl,
  getAllUrls,
};
