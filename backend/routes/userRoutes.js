const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
  searchUsers, 
  getAllUsers, 
  getMe, 
  updateProfile 
} = require('../controllers/authController');

// --- Fixed Route Order ---
// Pehle specific routes, phir parametric!
router.get('/me', authMiddleware, getMe);
router.get('/search', authMiddleware, searchUsers);
router.put('/profile', authMiddleware, updateProfile);
router.get('/:userId', authMiddleware, getAllUsers);

module.exports = router;
