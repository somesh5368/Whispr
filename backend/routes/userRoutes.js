// backend/routes/userRoutes.js

const express = require("express");
const router = express.Router();

const {
  getMe,
  searchUsers,
  getAllUsers,
  updateProfile,
  updateProfilePhoto,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  validate,
  updateProfileSchema,
  searchQuerySchema,
  userIdParamSchema,
} = require("../validators");
const { searchLimiter, uploadLimiter } = require("../config/rateLimiters");

// Get current logged-in user
router.get("/me", protect, getMe);

// Update profile details
router.put("/profile", protect, validate({ body: updateProfileSchema }), updateProfile);

// Update profile photo (supports /profile-photo and /profile/photo, rate limited)
router.put("/profile-photo", protect, uploadLimiter, upload.single("avatar"), updateProfilePhoto);
router.put("/profile/photo", protect, uploadLimiter, upload.single("avatar"), updateProfilePhoto);

// Search users by query (name/email, stricter rate limit)
router.get("/search", protect, searchLimiter, validate({ query: searchQuerySchema }), searchUsers);

// Get all users except current
router.get("/all/:userId", protect, validate({ params: userIdParamSchema }), getAllUsers);
router.get("/:userId", protect, validate({ params: userIdParamSchema }), getAllUsers);

module.exports = router;
