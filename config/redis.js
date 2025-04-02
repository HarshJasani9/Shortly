const Redis = require('ioredis');

// Why ioredis over the official 'redis' package?
// 1. Better Promise support out of the box.
// 2. Built-in support for Redis Cluster and Sentinel.
// 3. More robust error handling and auto-reconnection strategies.
// 4. Generally considered the standard in production Node.js apps.

// Create a new Redis instance using the URL from environment variables.
// If REDIS_URL is not provided, it defaults to localhost:6379
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  // Setting enableOfflineQueue to false ensures that if Redis is down,
  // commands immediately fail instead of queueing endlessly.
  // This allows our try/catch blocks in the controller to instantly catch
  // the error and fallback to MongoDB gracefully.
  enableOfflineQueue: false,
  retryStrategy(times) {
    // Retry connection every 2 seconds if Redis goes down, 
    // without blocking the main application thread.
    return 2000;
  }
});

redisClient.on('connect', () => {
  console.log('Redis Connected');
});

redisClient.on('error', (err) => {
  // We only log the error. We do not throw or crash the app.
  // This ensures the application falls back to MongoDB gracefully.
  console.error('Redis connection error:', err.message);
});

module.exports = redisClient;
