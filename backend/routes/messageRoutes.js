const express = require('express');
const { sendMessage, getMessages } = require('../controllers/messageController');

const router = express.Router();
router.post('/', sendMessage);                         // POST /api/messages
router.get('/:senderId/:receiverId', getMessages);     // GET  /api/messages/1/2

module.exports = router;
