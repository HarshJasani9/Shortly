const { nanoid } = require('nanoid');
const Url = require('../models/Url');
const Analytics = require('../models/Analytics');
const redisClient = require('../config/redis');

const CACHE_TTL = 86400; // 24 hours

/**
 * @desc    Shorten a long URL
 * @route   POST /api/shorten
 * @access  Public
 */
const shortenUrl = async (req, res, next) => {
  try {
    const { originalUrl } = req.body;
    const shortCode = nanoid(6);

    const newUrl = await Url.create({ originalUrl, shortCode });
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const shortUrl = `${baseUrl}/${newUrl.shortCode}`;

    try {
      await redisClient.set(`url:${shortCode}`, originalUrl, 'EX', CACHE_TTL);
    } catch (redisError) {
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
 * @desc    Redirect to the original URL and process analytics
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
      console.error('Redis Get Error (redirectUrl):', redisError.message);
    }

    // --- BACKGROUND PROCESSING FUNCTION ---
    // WHY NON-BLOCKING? The user just clicked a short link. They want to be redirected instantly.
    // If we `await` the Analytics.create() and Url.findOneAndUpdate() calls, they have to wait for the
    // database round-trips before the redirect happens.
    // By using `.catch()` or `.then()` instead of `await`, Node.js starts the database operations in the
    // background, and we can immediately send the HTTP response below.
    const fireBackgroundAnalytics = (targetUrl) => {
      const userAgent = req.headers['user-agent'] || '';
      const ua = userAgent.toLowerCase();
      
      // Parse Device
      let device = 'desktop';
      if (ua.includes('ipad') || ua.includes('tablet')) device = 'tablet';
      else if (ua.includes('iphone') || ua.includes('android') || ua.includes('mobile')) device = 'mobile';
      
      // Parse Browser
      let browser = 'Unknown';
      if (ua.includes('edge') || ua.includes('edg/')) browser = 'Edge';
      else if (ua.includes('opr/') || ua.includes('opera')) browser = 'Opera';
      else if (ua.includes('chrome')) browser = 'Chrome';
      else if (ua.includes('safari')) browser = 'Safari';
      else if (ua.includes('firefox')) browser = 'Firefox';

      const referrer = req.headers.referer || req.headers.referrer || 'Direct';

      // Non-blocking save: We do NOT use 'await'
      Analytics.create({ shortCode: code, device, browser, referrer })
        .catch(err => console.error('Analytics save error:', err.message));

      Url.findOneAndUpdate({ shortCode: code }, { $inc: { clicks: 1 } })
        .catch(err => console.error('Url click update error:', err.message));
    };

    // 2. Found in Cache? Redirect IMMEDIATELY, then fire background tasks.
    if (originalUrl) {
      res.redirect(originalUrl);
      fireBackgroundAnalytics(originalUrl);
      return;
    }

    // 3. Not in cache. Query MongoDB.
    const urlDoc = await Url.findOne({ shortCode: code });
    if (!urlDoc) {
      res.status(404);
      throw new Error('Short URL not found');
    }

    // 4. Redirect IMMEDIATELY
    res.redirect(urlDoc.originalUrl);

    // 5. Fire background analytics
    fireBackgroundAnalytics(urlDoc.originalUrl);

    // 6. Cache it in Redis (non-blocking)
    try {
      redisClient.set(`url:${code}`, urlDoc.originalUrl, 'EX', CACHE_TTL)
        .catch(err => console.error('Redis Set Error:', err.message));
    } catch (redisError) {
      console.error('Redis sync error:', redisError.message);
    }

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
    // Privacy feature: Only return URLs that the user explicitly asks for.
    // If no codes are provided, return an empty array to prevent exposing all links to the public.
    if (!req.query.codes) {
      return res.status(200).json([]);
    }

    const requestedCodes = req.query.codes.split(',');
    
    // Fetch only the requested URLs
    const urls = await Url.find({ shortCode: { $in: requestedCodes } }).sort({ createdAt: -1 });
    let urlsWithCacheStatus = [];
    
    try {
      if (urls.length > 0) {
        const keys = urls.map(u => `url:${u.shortCode}`);
        const redisValues = await redisClient.mget(keys);
        
        urlsWithCacheStatus = urls.map((u, index) => {
          const urlObj = u.toObject();
          urlObj.cached = redisValues[index] !== null;
          return urlObj;
        });
      }
    } catch (redisError) {
      console.error('Redis Mget Error (getAllUrls):', redisError.message);
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

module.exports = { shortenUrl, redirectUrl, getAllUrls };
