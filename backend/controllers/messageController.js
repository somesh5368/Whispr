const Message = require('../models/message');

// POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const newMsg = await Message.create(req.body);
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ message: 'Send failed', error: err.message });
  }
};

// GET /api/messages/:senderId/:receiverId
exports.getMessages = async (req, res) => {
  const { senderId, receiverId } = req.params;
  try {
    const msgs = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};
