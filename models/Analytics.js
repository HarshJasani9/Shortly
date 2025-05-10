const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  shortCode: {
    type: String,
    required: true,
    index: true, 
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  country: {
    type: String,
    default: 'Unknown',
  },
  device: {
    type: String,
    enum: ['mobile', 'desktop', 'tablet'],
    default: 'desktop',
  },
  browser: {
    type: String,
    default: 'Unknown',
  },
  referrer: {
    type: String,
    default: 'Direct',
  },
});

// WHY A COMPOUND INDEX?
// When retrieving analytics, we almost always query by both `shortCode` and a date range (`timestamp`).
// A compound index on { shortCode: 1, timestamp: -1 } allows MongoDB to instantly find all records
// for a specific URL, pre-sorted chronologically, without having to scan the entire collection.
// This is critical for keeping analytics queries extremely fast as the database grows.
analyticsSchema.index({ shortCode: 1, timestamp: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
