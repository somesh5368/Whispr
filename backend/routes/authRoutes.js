const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  getMe,
  searchUsers,
  getAllUsers,
  updateProfile,
  updateProfilePhoto,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadProfile");

// ============================================
// Authentication Routes
// ============================================

// Register new user
router.post("/register", registerUser);

// Login user
router.post("/login", loginUser);

// Get current logged-in user profile (Protected)
router.get("/me", protect, getMe);

// Update profile fields (Protected)
router.put("/profile", protect, updateProfile);

// Update profile photo via file upload (Protected)
router.put(
  "/profile/photo",
  protect,
  upload.single("avatar"),
  updateProfilePhoto
);

// Search users (Protected)
router.get("/search", protect, searchUsers);

// Get all users except current (Protected)
router.get("/all/:userId", protect, getAllUsers);

module.exports = router;
