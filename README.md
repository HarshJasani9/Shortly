# Shortly 🚀

A high-performance, production-ready URL Shortener built with **Node.js, Express, MongoDB, and Redis**.

Shortly takes long, unwieldy URLs and turns them into clean, shareable short links. It features a blazing-fast caching layer for instant redirects and a robust, non-blocking analytics engine to track clicks, devices, and referrers without compromising speed.

---

## ✨ Features

- **Lightning Fast Redirects:** Uses **Redis** as an in-memory cache to achieve sub-10ms redirects.
- **Asynchronous Analytics:** Tracks devices (Mobile/Desktop/Tablet), browsers, and referrers. Analytics are processed in the background so the user is never kept waiting during a redirect.
- **Production-Grade Security:** Implements IP-based rate limiting, input validation, and secure HTTP headers via Helmet.
- **Advanced Data Aggregation:** Uses MongoDB Aggregation Pipelines to efficiently compute time-series click data, top referrers, and device breakdowns.
- **Premium Glassmorphism UI:** A beautiful, responsive single-page HTML interface featuring animated mesh gradients and frosted glass elements (no build step required).

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js
- **Database:** MongoDB (via Mongoose)
- **Cache:** Redis (via ioredis)
- **Frontend:** Vanilla HTML, CSS, JavaScript (No build step required)
- **Utilities:** `nanoid` (for short code generation), `express-validator`, `express-rate-limit`, `helmet`, `morgan`.

---

## 🏗️ Architecture & Concepts

This project was built focusing on real-world backend scalability concepts:

1. **Write-Through Caching:** When a new URL is shortened, it is immediately written to both MongoDB and Redis. This ensures the very first click is just as fast as the hundredth.
2. **Graceful Fallbacks:** If the Redis server goes down, the `ioredis` offline queue is disabled, instantly throwing an error that the app silently catches. The app seamlessly falls back to MongoDB for redirects—zero downtime.
3. **Non-Blocking Background Tasks:** When a short link is clicked, the `res.redirect()` fires instantly. The analytics processing (user-agent parsing, click increments, database saves) happens asynchronously in the background using `.catch()` instead of `await`.
4. **Compound Indexing:** The `Analytics` schema uses a compound index on `{ shortCode: 1, timestamp: -1 }` to make time-series aggregation queries exponentially faster as the database grows.
5. **Privacy-First Data Fetching:** The frontend utilizes browser `localStorage` to track which URLs a user has generated, passing them to the backend to filter API results. This ensures users only see stats for links they created, achieving privacy without needing a complex authentication system.

---

## 🚦 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- Node.js (v16+)
- MongoDB (Local or Atlas)
- Redis (Local, Memurai for Windows, or Redis Cloud)

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd url-shortener
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy the `.env.example` file to create a `.env` file:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your connection strings:
   ```env
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/url-shortener
   BASE_URL=http://localhost:5000
   NODE_ENV=development
   REDIS_URL=redis://localhost:6379
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

5. **Open the App:**
   Visit `http://localhost:5000` in your browser.

---

## 📡 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/shorten` | Submit a long URL, returns a short code & URL. |
| `GET`  | `/:code` | Redirects to the original URL. Tracks analytics. |
| `GET`  | `/api/urls` | Returns all shortened URLs (includes cache status). |
| `GET`  | `/api/analytics/:code` | Returns aggregated analytics (clicks, devices, etc). |
| `GET`  | `/api/analytics/:code/raw`| Returns paginated raw click records. |

### Example Request (`POST /api/shorten`)
```json
// Body
{
  "originalUrl": "https://www.example.com/very/long/path"
}

// Response
{
  "originalUrl": "https://www.example.com/very/long/path",
  "shortCode": "x8k2p",
  "shortUrl": "http://localhost:5000/x8k2p"
}
```

---

## 📂 Folder Structure

```
/
├── config/
│   ├── db.js                  # MongoDB connection
│   └── redis.js               # Redis client initialization & fallback logic
├── controllers/
│   ├── urlController.js       # Core shortening and redirect logic
│   └── analyticsController.js # Aggregation pipelines for analytics
├── middleware/
│   ├── errorHandler.js        # Global error formatter
│   └── validate.js            # express-validator formatter
├── models/
│   ├── Url.js                 # URL Mongoose Schema
│   └── Analytics.js           # Analytics Mongoose Schema
├── public/
│   └── index.html             # Single-page frontend
├── routes/
│   └── urlRoutes.js           # API route definitions
├── server.js                  # Express app entry point
└── package.json
```
