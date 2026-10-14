// backend/middleware/uploadMiddleware.js
const multer = require("multer");

// Multer memory storage
const storage = multer.memoryStorage();

// Allowed MIME types for images
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Configure multer with strict limits (5MB max size, max 1 file)
const multerInstance = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1, // Enforce max 1 file
  },
});

/**
 * Validates the file buffer magic bytes using file-type.
 * Does not trust client-supplied mimetype or extension.
 */
const validateFileMagicBytes = async (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    return next();
  }

  try {
    const { fileTypeFromBuffer } = await import("file-type");
    const detected = await fileTypeFromBuffer(req.file.buffer);

    if (!detected || !ALLOWED_MIME_TYPES.has(detected.mime)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid file content. Only authentic JPEG, PNG, GIF, and WebP images are allowed.",
      });
    }

    // Overwrite client-supplied mimetype and add detected extension
    req.file.mimetype = detected.mime;
    req.file.detectedExt = detected.ext;
    next();
  } catch (err) {
    console.error("Magic bytes inspection error:", err);
    return res.status(400).json({
      success: false,
      message: "Failed to validate file type.",
    });
  }
};

/**
 * Middleware factory for single-file upload with magic-byte validation
 * and clean HTTP 400 error responses.
 */
const uploadSingleImage = (fieldName) => {
  const uploadHandler = multerInstance.single(fieldName);

  return (req, res, next) => {
    uploadHandler(req, res, async (err) => {
      if (err) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({
            success: false,
            message: "File size exceeds the maximum limit of 5MB.",
          });
        }
        if (err.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({
            success: false,
            message: "Only 1 file can be uploaded at a time.",
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || "File upload failed.",
        });
      }

      await validateFileMagicBytes(req, res, next);
    });
  };
};

const upload = uploadSingleImage;
upload.single = uploadSingleImage;
upload.multer = multerInstance;
upload.validateFileMagicBytes = validateFileMagicBytes;

module.exports = upload;
