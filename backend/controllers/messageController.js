const Message = require("../models/message");
const User = require("../models/user");
const cloudinary = require("../config/cloudinary");

// ============================================
// GET: Get Recent Contacts
// ============================================
exports.getRecentContacts = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all messages involving this user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 })
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    // Group messages by contact
    const contactMap = new Map();

    messages.forEach((msg) => {
      const contact =
        msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      const contactId = contact._id.toString();

      if (!contactMap.has(contactId)) {
        contactMap.set(contactId, {
          _id: contact._id,
          name: contact.name,
          email: contact.email,
          avatar: contact.avatar,
          lastMessage: msg.message || "[Image]",
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }

      // Count unread messages
      if (msg.receiver._id.toString() === userId && msg.status !== "read") {
        contactMap.get(contactId).unreadCount += 1;
      }
    });

    // Convert map to sorted array
    const recentContacts = Array.from(contactMap.values).sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    res.json({
      success: true,
      contacts: recentContacts,
    });
  } catch (error) {
    console.error("❌ getRecentContacts error:", error);
    res.status(500).json({
      message: "Failed to load contacts",
      error: error.message,
    });
  }
};

// ============================================
// GET: Get Messages Between Two Users
// ============================================
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Find all messages between users
    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    // Mark messages as read
    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        status: { $ne: "read" },
      },
      { status: "read" }
    );

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("❌ getMessages error:", error);
    res.status(500).json({
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// ============================================
// POST: Send Message
// ============================================
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, message, image } = req.body;
    const senderId = req.user.id;

    // Validate input
    if (!receiverId || !message) {
      return res.status(400).json({
        message: "Receiver ID and message are required",
      });
    }

    // Create message
    const newMsg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message,
      image: image || null,
      status: "sent",
    });

    // Populate sender and receiver info
    await newMsg.populate("sender", "name email avatar");
    await newMsg.populate("receiver", "name email avatar");

    res.status(201).json({
      success: true,
      message: newMsg,
    });
  } catch (error) {
    console.error("❌ sendMessage error:", error);
    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// ============================================
// POST: Mark Messages as Read
// ============================================
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    // Update all unread messages
    const result = await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        status: { $ne: "read" },
      },
      { status: "read" }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ markAsRead error:", error);
    res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};

// ============================================
// POST: Upload Message Image
// ============================================
exports.uploadMessageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file provided",
      });
    }

    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({
        message: "Receiver ID is required",
      });
    }

    // Upload to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "whispr/messages",
        resource_type: "image",
      },
      async (error, result) => {
        if (error) {
          console.error("❌ Cloudinary error:", error);
          return res.status(500).json({
            message: "Upload failed",
            error: error.message,
          });
        }

        // Create message with image
        const msgDoc = await Message.create({
          sender: senderId,
          receiver: receiverId,
          message: "[Image]",
          image: result.secure_url,
          status: "sent",
        });

        await msgDoc.populate("sender", "name email avatar");
        await msgDoc.populate("receiver", "name email avatar");

        res.status(201).json({
          success: true,
          message: msgDoc,
        });
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("❌ uploadMessageImage error:", error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
  }
};

// ============================================
// DELETE: Delete Message
// ============================================
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    // Find message
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    // Check if user is sender
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({
        message: "Not authorized to delete this message",
      });
    }

    // Delete message
    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("❌ deleteMessage error:", error);
    res.status(500).json({
      message: "Failed to delete message",
      error: error.message,
    });
  }
};

