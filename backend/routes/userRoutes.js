// backend/routes/userRoutes.js
const express = require("express");
const router = express.Router();

const {
  searchUsers,
  getAllUsers,
  updateProfile,
  updateProfilePhoto,
  getMe,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadProfile");

// Get current logged-in user
router.get("/me", protect, getMe);

// Search users
router.get("/search", protect, searchUsers);

// Get all users except current
router.get("/all/:userId", protect, getAllUsers);

// Update profile fields (name, bio, phone, img URL string)
router.put("/profile", protect, updateProfile);

// Update profile photo via file upload (Cloudinary)
router.put(
  "/profile/photo",
  protect,
  upload.single("avatar"),
  updateProfilePhoto
);

module.exports = router;
