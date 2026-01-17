// backend/config/cloudinary.js

const cloudinary = require("cloudinary").v2;
const multer = require("multer");

// Ensure env is loaded even if this file is required very early
if (!process.env.CLOUDINARY_CLOUD_NAME) {
  // Safe re-call; dotenv ignores duplicates
  require("dotenv").config();
}

// Debug log once at startup (do NOT log real key/secret)
console.log("CLOUDINARY ENV CHECK =>", {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? "OK" : "MISSING",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? "OK" : "MISSING",
});

// Configure Cloudinary from env variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage (for streaming to Cloudinary)
const storage = multer.memoryStorage();

// Multer instance with limits + basic image filter
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"), false);
    }
    cb(null, true);
  },
});

module.exports = {
  cloudinary,
  upload,
};
