// Load environment variables from .env file into process.env
require('dotenv').config();

// Core dependencies
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Local imports
const connectDB = require('./config/db');
const urlRoutes = require('./routes/urlRoutes');
const errorHandler = require('./middleware/errorHandler');

// Initialize the Express application
const app = express();

// Connect to MongoDB
connectDB();

// --- GLOBAL MIDDLEWARE (Order matters!) ---

// 1. Security Headers: 
// Disabling contentSecurityPolicy because we are using inline scripts/styles in our public/index.html
app.use(helmet({ contentSecurityPolicy: false }));

// 2. CORS: allow Cross-Origin Resource Sharing
app.use(cors());

// 3. Request Logging (dev mode only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan(':method :url :status :response-time ms'));
}

// 4. Global Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true, 
  legacyHeaders: false, 
});
app.use(globalLimiter);

// 5. Serve static HTML frontend
// Express will look in the /public folder and serve index.html at '/'
app.use(express.static(path.join(__dirname, 'public')));

// 6. Body Parser
app.use(express.json());

// --- ROUTES ---

app.use('/', urlRoutes);

// --- ERROR HANDLING ---

// Global Error Handler
app.use(errorHandler);

// --- SERVER SETUP ---

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
