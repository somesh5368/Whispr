const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { searchUsers, getAllUsers } = require('../controllers/authController');

// 🔹 Search users by name/email
router.get('/search', authMiddleware, searchUsers);

// 🔹 Get all users except current user (optional)
router.get('/:userId', authMiddleware, getAllUsers);

module.exports = router;
