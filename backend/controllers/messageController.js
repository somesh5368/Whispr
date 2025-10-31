const Message = require('../models/message');
const User = require('../models/user');

// ✅ Get recent contacts for a user
exports.getRecentContacts = async (req, res) => {
  const userId = req.user._id;
  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    });

    const contactIds = [
      ...new Set(
        messages.map((msg) =>
          msg.senderId.toString() === userId.toString()
            ? msg.receiverId.toString()
            : msg.senderId.toString()
        )
      ),
    ];

    const contacts = await User.find({ _id: { $in: contactIds } }).select('-password');
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load contacts' });
  }
};
