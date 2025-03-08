// Load environment variables from .env file into process.env
require('dotenv').config();

// Core dependencies
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Local imports
const connectDB = require('./config/db');
const urlRoutes = require('./routes/urlRoutes');
const errorHandler = require('./middleware/errorHandler');

// Initialize the Express application
const app = express();

// Connect to MongoDB
connectDB();

// --- GLOBAL MIDDLEWARE (Order matters!) ---

// 1. Security Headers: helmet sets various HTTP headers to secure the app
app.use(helmet());

// 2. CORS: allow Cross-Origin Resource Sharing (currently allowing all origins)
app.use(cors());

// 3. Request Logging: morgan logs incoming requests (dev mode only)
// Note: You must set NODE_ENV=development in your .env file to see these logs
if (process.env.NODE_ENV === 'development') {
  app.use(morgan(':method :url :status :response-time ms'));
}

// 4. Global Rate Limiting: 100 requests per 15 minutes for all routes
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use(globalLimiter);

// 5. Body Parser: allows reading req.body in JSON format
app.use(express.json());

// --- ROUTES ---

// Mount the URL routes at root
app.use('/', urlRoutes);

// --- ERROR HANDLING ---

// Global Error Handler: must be the last middleware in the chain
app.use(errorHandler);

// --- SERVER SETUP ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
