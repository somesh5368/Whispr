// backend/validators/validate.js
const { z } = require("zod");

/**
 * Reusable Express middleware for validating req.body, req.params, and/or req.query.
 * Rejects non-string types on strictly typed string schemas to eliminate NoSQL injection.
 * Returns HTTP 400 with a clean list of field errors.
 *
 * @param {object} schemaMap - { body?: z.ZodSchema, params?: z.ZodSchema, query?: z.ZodSchema }
 */
const validate = (schemaMap) => {
  return (req, res, next) => {
    try {
      if (schemaMap.params) {
        req.params = schemaMap.params.parse(req.params);
      }
      if (schemaMap.query) {
        req.query = schemaMap.query.parse(req.query);
      }
      if (schemaMap.body) {
        req.body = schemaMap.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const issues = err.issues || err.errors || [];
        const formattedErrors = issues.map((e) => ({
          field: Array.isArray(e.path) && e.path.length > 0 ? e.path.join(".") : "request",
          message: e.message,
        }));
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: formattedErrors,
        });
      }
      next(err);
    }
  };
};

module.exports = validate;
