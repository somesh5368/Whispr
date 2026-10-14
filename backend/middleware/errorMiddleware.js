// backend/middleware/errorMiddleware.js

/**
 * 404 Not Found middleware for unknown API routes.
 */
const notFound = (req, res, next) => {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Central Error Handling Middleware.
 * Logs real errors server-side and suppresses internal details in production.
 */
const errorHandler = (err, req, res, _next) => {
  // Respect established error status code or default to 500
  let statusCode =
    res.statusCode && res.statusCode >= 400
      ? res.statusCode
      : err.statusCode || err.status || 500;

  // Handle Multer upload errors cleanly as 400 Bad Request
  if (err.name === "MulterError") {
    statusCode = 400;
  }

  // Always log the full error server-side with request context
  console.error(
    `[Error] ${req.method} ${req.originalUrl} - Status ${statusCode}:`,
    err.stack || err
  );

  const isProduction = process.env.NODE_ENV === "production";

  // Sanitize message for production 5xx errors to prevent leaking DB / Cloudinary internals
  let message = err.message || "An unexpected error occurred";
  if (isProduction && statusCode >= 500) {
    message = "Internal Server Error";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(isProduction ? {} : { stack: err.stack, details: err.message }),
  });
};

module.exports = {
  notFound,
  errorHandler,
};
