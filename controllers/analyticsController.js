const Analytics = require('../models/Analytics');
const Url = require('../models/Url');

/**
 * @desc    Get aggregated analytics for a short URL
 * @route   GET /api/analytics/:code
 * @access  Public
 */
const getAnalytics = async (req, res, next) => {
  try {
    const { code } = req.params;

    // Verify the URL exists first
    const urlDoc = await Url.findOne({ shortCode: code });
    if (!urlDoc) {
      res.status(404);
      throw new Error('Short URL not found');
    }

    // WHAT IS A MONGODB AGGREGATION PIPELINE?
    // An aggregation pipeline is a framework for data aggregation. It allows us to process data records
    // and return computed results in a single database query. Instead of pulling thousands of raw 
    // click records into Node.js and using expensive loops to count devices/browsers (which uses lots of RAM),
    // we send the instructions to MongoDB. MongoDB does the counting internally much faster.

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Pipeline for last 7 days time-series
    const last7DaysData = await Analytics.aggregate([
      // Stage 1: $match - Filters the documents down to only the requested shortCode and the last 7 days.
      { $match: { shortCode: code, timestamp: { $gte: sevenDaysAgo } } },
      
      // Stage 2: $group - Groups documents by formatting the timestamp to "YYYY-MM-DD".
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          clicks: { $sum: 1 } // Adds 1 for every document matching the date
        }
      },
      
      // Stage 3: $sort - Orders the resulting grouped documents chronologically.
      { $sort: { _id: 1 } },
      
      // Stage 4: $project - Reshapes the output format to clean up the _id field.
      { $project: { _id: 0, date: '$_id', clicks: 1 } }
    ]);

    // Pipeline for device counts
    const deviceData = await Analytics.aggregate([
      { $match: { shortCode: code } },
      { $group: { _id: '$device', count: { $sum: 1 } } }
    ]);

    // Pipeline for browser counts
    const browserData = await Analytics.aggregate([
      { $match: { shortCode: code } },
      { $group: { _id: '$browser', count: { $sum: 1 } } }
    ]);

    // Pipeline for top referrers
    const topReferrersData = await Analytics.aggregate([
      { $match: { shortCode: code } },
      { $group: { _id: '$referrer', count: { $sum: 1 } } },
      { $sort: { count: -1 } }, // Sort descending by count
      { $limit: 5 }, // Only keep the top 5
      { $project: { _id: 0, referrer: '$_id', count: 1 } }
    ]);

    // Format the aggregation results into clean key-value objects
    const devices = { mobile: 0, desktop: 0, tablet: 0 };
    deviceData.forEach(d => { devices[d._id] = d.count; });

    const browsers = {};
    browserData.forEach(b => { browsers[b._id] = b.count; });

    res.status(200).json({
      shortCode: urlDoc.shortCode,
      originalUrl: urlDoc.originalUrl,
      totalClicks: urlDoc.clicks,
      last7Days: last7DaysData,
      devices,
      browsers,
      topReferrers: topReferrersData
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get raw paginated analytics records
 * @route   GET /api/analytics/:code/raw
 * @access  Public
 */
const getRawAnalytics = async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // Setup Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Fetch total number of records for total pages calculation
    const total = await Analytics.countDocuments({ shortCode: code });
    
    // Fetch raw data slice
    const data = await Analytics.find({ shortCode: code })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      data,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAnalytics,
  getRawAnalytics,
};
