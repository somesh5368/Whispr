const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

// 🔹 Recent contacts
router.get('/recent-contacts', authMiddleware, messageController.getRecentContacts);

module.exports = router;
