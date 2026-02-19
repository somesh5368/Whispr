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
const upload = require("../middleware/uploadMiddleware");

// Public routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Protected routes
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);

// Profile photo upload (expects field name "avatar")
router.put(
  "/profile-photo",
  protect,
  upload.single("avatar"),
  updateProfilePhoto
);

// Search routes
router.get("/search", protect, searchUsers);
router.get("/users/:userId", protect, getAllUsers);

module.exports = router;
