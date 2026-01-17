// backend/routes/authRoutes.js
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

// Register
router.post("/register", registerUser);

// Login
router.post("/login", loginUser);

// Current logged-in user
router.get("/me", protect, getMe);

// Search users
router.get("/search", protect, searchUsers);

// Get all users except current
router.get("/all/:userId", protect, getAllUsers);

// Update profile fields
router.put("/profile", protect, updateProfile);

// Update profile photo via file upload
router.put(
  "/profile/photo",
  protect,
  upload.single("avatar"),
  updateProfilePhoto
);

module.exports = router;
