// backend/routes/userRoutes.js

const express = require("express");
const router = express.Router();

const {
  getMe,
  searchUsers,
  getAllUsers,
} = require("../controllers/authController");

const { protect } = require("../middleware/authMiddleware");

// Get current logged-in user
router.get("/me", protect, getMe);

// Search users by query (name/email)
router.get("/search", protect, searchUsers);

// Get all users except current
router.get("/all/:userId", protect, getAllUsers);

module.exports = router;
