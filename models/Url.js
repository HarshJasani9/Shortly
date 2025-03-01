// Import mongoose to define the schema and model
const mongoose = require('mongoose');

// Define the schema for a URL document
// A schema defines the structure of documents in a MongoDB collection
const urlSchema = new mongoose.Schema({
  // The original, long URL provided by the user
  originalUrl: {
    type: String,
    required: true,
  },
  // The generated short code that identifies this URL
  shortCode: {
    type: String,
    required: true,
    unique: true, // Ensures no two URLs have the same short code
  },
  // The number of times the short URL has been clicked
  clicks: {
    type: Number,
    default: 0, // Starts at 0 when created
  },
  // The timestamp when this URL was shortened
  createdAt: {
    type: Date,
    default: Date.now, // Automatically set to current date/time
  },
});

// Create and export the Mongoose model based on the schema
// The first argument 'Url' is the singular name of the collection (Mongoose will pluralize it to 'urls')
module.exports = mongoose.model('Url', urlSchema);
