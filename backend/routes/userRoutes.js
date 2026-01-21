const express = require("express");
const router = express.Router();

const {
  getMe,
  searchUsers,
  getAllUsers,
} = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// ============================================
// User Routes (No Duplicates - Auth handles profile updates)
// ============================================

// Get current logged-in user (Protected)
router.get("/me", protect, getMe);

// Search users (Protected)
router.get("/search", protect, searchUsers);

// Get all users except current (Protected)
router.get("/all/:userId", protect, getAllUsers);

module.exports = router;
