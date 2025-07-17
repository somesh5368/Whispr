// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/users/:userId => returns all users except current user
router.get('/:userId', async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.params.userId } }).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

module.exports = router;
