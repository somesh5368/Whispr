const Message = require('../models/message');
const User = require('../models/user');
const { io } = require('../server');

// Send a message via REST (for chat start & API test)
exports.sendMessage = async (req, res) => {
  try {
    const newMsg = await Message.create(req.body);
    res.status(201).json(newMsg);
  } catch (err) {
    res.status(500).json({ message: 'Send failed', error: err.message });
  }
};

// Get chat messages between 2 users
exports.getMessages = async (req, res) => {
  const { senderId, receiverId } = req.params;
  try {
    const msgs = await Message.find({
      $or: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId }
      ]
    }).sort({ createdAt: 1 });

    // PATCH: Mark all unread messages for this receiver as "read" and notify sender
    const unreadMsgs = msgs.filter(
      msg => msg.receiverId === receiverId && msg.status !== "read"
    );
    for (let msg of unreadMsgs) {
      msg.status = "read";
      await msg.save();
      if (io) {
        io.to(msg.senderId).emit("messageRead", { messageId: msg._id, status: "read" });
      }
    }

    res.json(msgs);
  } catch (err) {
    res.status(500).json({ message: 'Fetch failed', error: err.message });
  }
};

// Get recent contacts for a user, sorted by latest message time
exports.getRecentContacts = async (req, res) => {
  const userId = req.user._id;
  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }]
    }).sort({ createdAt: -1 });

    const contactMap = {};
    messages.forEach(msg => {
      const contactId =
        msg.senderId === userId
          ? msg.receiverId
          : msg.senderId;

      if (
        !contactMap[contactId] ||
        new Date(msg.createdAt) > new Date(contactMap[contactId].createdAt)
      ) {
        contactMap[contactId] = msg;
      }
    });

    const sortedContacts = Object.entries(contactMap)
      .sort(([, aMsg], [, bMsg]) => new Date(bMsg.createdAt) - new Date(aMsg.createdAt))
      .map(([contactId]) => contactId);

    const contacts = await User.find({ _id: { $in: sortedContacts } }).select('-password');

    const contactsSorted = sortedContacts
      .map(id => contacts.find(user => user._id.toString() === id))
      .filter(Boolean);

    res.status(200).json(contactsSorted);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load contacts' });
  }
};
