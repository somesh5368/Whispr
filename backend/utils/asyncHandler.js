// backend/utils/asyncHandler.js

/**
 * Wraps an async route handler or middleware to catch rejected promises
 * and pass the error to Express's next() error-handling middleware.
 *
 * @param {Function} fn - Async express route handler (req, res, next)
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
