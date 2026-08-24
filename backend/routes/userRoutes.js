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

// Get current logged-in user
router.get("/me", protect, getMe);

// Update profile details
router.put("/profile", protect, updateProfile);

// Update profile photo (supports /profile-photo and /profile/photo)
router.put("/profile-photo", protect, upload.single("avatar"), updateProfilePhoto);
router.put("/profile/photo", protect, upload.single("avatar"), updateProfilePhoto);

// Search users by query (name/email)
router.get("/search", protect, searchUsers);

// Get all users except current
router.get("/all/:userId", protect, getAllUsers);
router.get("/:userId", protect, getAllUsers);

module.exports = router;
