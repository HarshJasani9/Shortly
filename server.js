// Load environment variables from .env file into process.env
require('dotenv').config();

// Import Express to create our web server
const express = require('express');
// Import our database connection function
const connectDB = require('./config/db');
// Import our URL routes
const urlRoutes = require('./routes/urlRoutes');
// Import the global error handler middleware
const errorHandler = require('./middleware/errorHandler');

// Initialize the Express application
const app = express();

// Connect to MongoDB
connectDB();

// Built-in middleware to parse incoming JSON payloads
app.use(express.json());

// Mount the URL routes. 
// Any request starting with '/' will be handled by urlRoutes.
// Note: We're mounting at root '/' because GET /:code needs to be at the top level
app.use('/', urlRoutes);

// Global error handling middleware must be registered after all routes
app.use(errorHandler);

// Define the port to listen on, defaulting to 5000 if not in .env
const PORT = process.env.PORT || 5000;

// Start the server and listen for incoming connections
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
