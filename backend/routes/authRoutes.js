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

// Authentication routes
router.post("/register", registerUser);
router.post("/login", loginUser);

// Legacy aliases (canonical routes are under /api/users)
router.get("/me", protect, getMe);
router.put("/profile", protect, updateProfile);
router.put("/profile-photo", protect, upload.single("avatar"), updateProfilePhoto);
router.get("/search", protect, searchUsers);
router.get("/users/:userId", protect, getAllUsers);

module.exports = router;
