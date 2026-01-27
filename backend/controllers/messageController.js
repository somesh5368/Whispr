// controllers/messageController.js
const Message = require("../models/message");
const User = require("../models/user");
const { cloudinary } = require("../config/cloudinary");

// Get recent contacts for sidebar
exports.getRecentContacts = async (req, res) => {
  try {
    const userId = req.user.id; // current user

    // All messages where user is sender or receiver
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 }) // latest first
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const contactMap = new Map(); // group by contact

    messages.forEach((msg) => {
      // determine other person in this message
      const contact =
        msg.sender._id.toString() === userId ? msg.receiver : msg.sender;
      const contactId = contact._id.toString();

      // first time this contact appears
      if (!contactMap.has(contactId)) {
        contactMap.set(contactId, {
          _id: contact._id,
          name: contact.name,
          email: contact.email,
          avatar: contact.avatar,
          lastMessage: msg.message || "[Image]", // fallback text
          lastMessageAt: msg.createdAt,
          unreadCount: 0,
        });
      }

      // count unread messages for this contact
      if (
        msg.receiver._id.toString() === userId &&
        msg.status !== "read"
      ) {
        contactMap.get(contactId).unreadCount += 1;
      }
    });

    // convert map to array and sort by last message time
    const recentContacts = Array.from(contactMap.values()).sort(
      (a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
    );

    res.json({
      success: true,
      contacts: recentContacts,
    });
  } catch (error) {
    console.error("getRecentContacts error:", error);
    res.status(500).json({
      message: "Failed to load contacts",
      error: error.message,
    });
  }
};

// Get messages between two users
exports.getMessages = async (req, res) => {
  try {
    const { userId } = req.params; // other user
    const currentUserId = req.user.id; // current user

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    })
      .sort({ createdAt: 1 }) // oldest first
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    // mark all messages from other user as read
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
    console.error("getMessages error:", error);
    res.status(500).json({
      message: "Failed to fetch messages",
      error: error.message,
    });
  }
};

// Send text message
exports.sendMessage = async (req, res) => {
  try {
    const { receiverId, message, image } = req.body;
    const senderId = req.user.id;

    // require receiver and some content
    if (!receiverId || (!message && !image)) {
      return res.status(400).json({
        message: "Receiver ID and message or image are required",
      });
    }

    const newMsg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: message || "[Image]", // default text for image-only
      image: image || null,
      status: "sent",
    });

    await newMsg.populate("sender", "name email avatar");
    await newMsg.populate("receiver", "name email avatar");

    res.status(201).json({
      success: true,
      message: newMsg,
    });
  } catch (error) {
    console.error("sendMessage error:", error);
    res.status(500).json({
      message: "Failed to send message",
      error: error.message,
    });
  }
};

// Mark messages from a specific user as read
exports.markAsRead = async (req, res) => {
  try {
    const { userId } = req.params; // other user
    const currentUserId = req.user.id; // current user

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
    console.error("markAsRead error:", error);
    res.status(500).json({
      message: "Failed to mark messages as read",
      error: error.message,
    });
  }
};

// Upload image + create message
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

    // upload buffer to Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "whispr/messages",
        resource_type: "image",
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary error:", error);
          return res.status(500).json({
            message: "Upload failed",
            error: error.message,
          });
        }

        const msgDoc = await Message.create({
          sender: senderId,
          receiver: receiverId,
          message: "[Image]", // fixed label
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

    uploadStream.end(req.file.buffer); // send buffer to Cloudinary
  } catch (error) {
    console.error("uploadMessageImage error:", error);
    res.status(500).json({
      message: "Upload failed",
      error: error.message,
    });
  }
};

// Delete message by ID
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const message = await Message.findById(messageId); // find message

    if (!message) {
      return res.status(404).json({
        message: "Message not found",
      });
    }

    // only sender can delete
    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({
        message: "Not authorized to delete this message",
      });
    }

    await Message.findByIdAndDelete(messageId); // delete message

    res.json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("deleteMessage error:", error);
    res.status(500).json({
      message: "Failed to delete message",
      error: error.message,
    });
  }
};
