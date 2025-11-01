const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

router.post('/', authMiddleware, messageController.sendMessage);
router.get('/:senderId/:receiverId', authMiddleware, messageController.getMessages);
router.get('/recent-contacts', authMiddleware, messageController.getRecentContacts);

module.exports = router;
