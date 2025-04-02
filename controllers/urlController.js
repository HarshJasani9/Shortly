const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const redisClient = require('../config/redis');

// Cache expiry: 24 hours (86400 seconds)
// TTL (Time To Live) is how long the data stays in Redis before being automatically deleted.
// 24 hours makes sense here because most clicks happen within the first day of sharing a link.
// After that, we can afford the 50ms MongoDB lookup for rare clicks, saving precious Redis RAM.
const CACHE_TTL = 86400;

/**
 * @desc    Shorten a long URL
 * @route   POST /api/shorten
 * @access  Public
 */
const shortenUrl = async (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    const shortCode = nanoid(6);

    const newUrl = await Url.create({
      originalUrl,
      shortCode,
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const shortUrl = `${baseUrl}/${newUrl.shortCode}`;

    // --- REDIS CACHING (Write-through) ---
    // Save to Redis immediately so the very first click is blazing fast.
    try {
      await redisClient.set(`url:${shortCode}`, originalUrl, 'EX', CACHE_TTL);
    } catch (redisError) {
      // Fallback: If Redis set fails, just log it. The app still works because data is in MongoDB.
      console.error('Redis Set Error (shortenUrl):', redisError.message);
    }

    res.status(201).json({
      originalUrl: newUrl.originalUrl,
      shortCode: newUrl.shortCode,
      shortUrl: shortUrl,
    });
  } catch (error) {
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
    let originalUrl = null;

    // 1. Check Redis first
    try {
      originalUrl = await redisClient.get(`url:${code}`);
    } catch (redisError) {
      // HOW THE FALLBACK WORKS: 
      // If Redis is down, ioredis throws an error here. We silently catch it.
      // originalUrl remains `null`, and the code simply falls through to Step 3.
      console.error('Redis Get Error (redirectUrl):', redisError.message);
    }

    // 2. Found in Cache? Redirect immediately!
    if (originalUrl) {
      // Background async task: Update clicks in MongoDB without `await`-ing.
      // The user gets redirected instantly while MongoDB updates in the background.
      Url.findOneAndUpdate({ shortCode: code }, { $inc: { clicks: 1 } })
        .catch(err => console.error('Background Click Update Error:', err.message));
        
      return res.redirect(originalUrl);
    }

    // 3. Not in cache (or Redis is down). Query MongoDB instead.
    const urlDoc = await Url.findOne({ shortCode: code });

    if (!urlDoc) {
      res.status(404);
      throw new Error('Short URL not found');
    }

    // 4. Found in MongoDB? Update clicks, save, and cache in Redis.
    urlDoc.clicks++;
    await urlDoc.save();

    try {
      await redisClient.set(`url:${code}`, urlDoc.originalUrl, 'EX', CACHE_TTL);
    } catch (redisError) {
      console.error('Redis Set Error (after MongoDB lookup):', redisError.message);
    }

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
    const urls = await Url.find().sort({ createdAt: -1 });
    let urlsWithCacheStatus = [];
    
    // 5. Add cache status to each URL
    try {
      if (urls.length > 0) {
        // Prepare all cache keys
        const keys = urls.map(u => `url:${u.shortCode}`);
        
        // Fetch all values from Redis in one network call using mget
        const redisValues = await redisClient.mget(keys);
        
        // Map the results back to the URLs
        urlsWithCacheStatus = urls.map((u, index) => {
          // Convert Mongoose document to lean plain object so we can add properties
          const urlObj = u.toObject();
          // If the redisValue at this index is not null, it means it's cached!
          urlObj.cached = redisValues[index] !== null;
          return urlObj;
        });
      }
    } catch (redisError) {
      console.error('Redis Mget Error (getAllUrls):', redisError.message);
      // Fallback if Redis is down
      urlsWithCacheStatus = urls.map(u => {
        const urlObj = u.toObject();
        urlObj.cached = false;
        return urlObj;
      });
    }

    res.status(200).json(urlsWithCacheStatus);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  shortenUrl,
  redirectUrl,
  getAllUrls,
};
