// Import mongoose to interact with MongoDB
const mongoose = require('mongoose');

// Asynchronous function to connect to the MongoDB database
const connectDB = async () => {
  try {
    // Attempt to connect using the connection string from environment variables
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // If the connection fails, log the error and exit the Node.js process
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // 1 means exit with failure
  }
};

// Export the function so it can be used in server.js
module.exports = connectDB;
