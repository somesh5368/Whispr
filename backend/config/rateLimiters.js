// backend/config/rateLimiters.js
const rateLimit = require("express-rate-limit");

// Rate limit window and threshold constants
const RATE_LIMIT_CONFIG = {
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 15,
    MESSAGE: "Too many authentication attempts. Please try again after 15 minutes.",
  },
  GENERAL_API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 300,
    MESSAGE: "Too many requests from this IP. Please slow down.",
  },
  SEARCH: {
    WINDOW_MS: 1 * 60 * 1000, // 1 minute
    MAX: 30,
    MESSAGE: "Too many search requests. Please wait a minute before searching again.",
  },
  MESSAGE_ACTIONS: {
    WINDOW_MS: 1 * 60 * 1000, // 1 minute
    MAX: 60,
    MESSAGE: "Message action rate limit exceeded. Please wait a moment.",
  },
  UPLOAD: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX: 25,
    MESSAGE: "Upload limit reached. Please wait before uploading more files.",
  },
};

// Custom handler to guarantee JSON 429 with explicit Retry-After header
const createLimiter = ({ windowMs, max, message }) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // draft-6/draft-7 RateLimit-* headers
    legacyHeaders: false,  // Disable X-RateLimit-* headers
    handler: (req, res, _next, _options) => {
      const retryAfterSeconds = Math.ceil(windowMs / 1000);
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds,
      });
    },
  });
};

const authLimiter = createLimiter({
  windowMs: RATE_LIMIT_CONFIG.AUTH.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH.MAX,
  message: RATE_LIMIT_CONFIG.AUTH.MESSAGE,
});

const generalApiLimiter = createLimiter({
  windowMs: RATE_LIMIT_CONFIG.GENERAL_API.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.GENERAL_API.MAX,
  message: RATE_LIMIT_CONFIG.GENERAL_API.MESSAGE,
});

const searchLimiter = createLimiter({
  windowMs: RATE_LIMIT_CONFIG.SEARCH.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.SEARCH.MAX,
  message: RATE_LIMIT_CONFIG.SEARCH.MESSAGE,
});

const messageActionLimiter = createLimiter({
  windowMs: RATE_LIMIT_CONFIG.MESSAGE_ACTIONS.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.MESSAGE_ACTIONS.MAX,
  message: RATE_LIMIT_CONFIG.MESSAGE_ACTIONS.MESSAGE,
});

const uploadLimiter = createLimiter({
  windowMs: RATE_LIMIT_CONFIG.UPLOAD.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.UPLOAD.MAX,
  message: RATE_LIMIT_CONFIG.UPLOAD.MESSAGE,
});

module.exports = {
  RATE_LIMIT_CONFIG,
  authLimiter,
  generalApiLimiter,
  searchLimiter,
  messageActionLimiter,
  uploadLimiter,
};
