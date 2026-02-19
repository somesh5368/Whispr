// backend/controllers/messageController.js
const Message = require("../models/message");
const User = require("../models/user");
const { cloudinary } = require("../config/cloudinary");

// ============================================
// Get recent contacts for sidebar
// GET /api/messages/recent
// ============================================
const getRecentContacts = async (req, res) => {
  try {
    const userId = req.user.id; // current user

    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    })
      .sort({ createdAt: -1 }) // latest first
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const contactMap = new Map(); // group by contact

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

      if (
        msg.receiver._id.toString() === userId &&
        msg.status !== "read"
      ) {
        contactMap.get(contactId).unreadCount += 1;
      }
    });

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
      success: false,
      message: "Failed to load contacts",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// ============================================
// Get messages between two users
// GET /api/messages/:userId
// ============================================
const getMessages = async (req, res) => {
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
      success: false,
      message: "Failed to fetch messages",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// ============================================
// Send text message
// POST /api/messages/send
// body: { receiverId, message, image? }
// ============================================
const sendMessage = async (req, res) => {
  try {
    const { receiverId, message, image } = req.body;
    const senderId = req.user.id;

    if (!receiverId || (!message && !image)) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID and message or image are required",
      });
    }

    const newMsg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: message || "[Image]",
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
      success: false,
      message: "Failed to send message",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// ============================================
// Mark messages from a specific user as read
// PATCH /api/messages/:userId/read
// ============================================
const markAsRead = async (req, res) => {
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
      success: false,
      message: "Failed to mark messages as read",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// ============================================
// Upload image + create message
// POST /api/messages/upload-image
// ============================================
const uploadMessageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file provided",
      });
    }

    const { receiverId } = req.body;
    const senderId = req.user.id;

    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: "Receiver ID is required",
      });
    }

    if (req.file.size > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        message: "File size must be less than 5MB",
      });
    }

    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedMimes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Only image files are allowed (JPEG, PNG, GIF, WebP)",
      });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "whispr/messages",
        resource_type: "auto",
        width: 800,
        height: 600,
        crop: "limit",
        quality: "auto",
        fetch_format: "auto",
      },
      async (error, result) => {
        if (error) {
          console.error("Cloudinary error:", error);
          return res.status(500).json({
            success: false,
            message: "Upload failed",
            error: error.message,
          });
        }

        try {
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
        } catch (dbError) {
          console.error("Database error:", dbError);
          res.status(500).json({
            success: false,
            message: "Failed to save message",
            error: dbError.message,
          });
        }
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (error) {
    console.error("uploadMessageImage error:", error);
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// ============================================
// Update message status (sent/delivered/read)
// PUT /api/messages/:messageId/status
// body: { status: "sent" | "delivered" | "read" }
// ============================================
const updateMessageStatus = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    const allowedStatuses = ["sent", "delivered", "read"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Optionally: only receiver can mark as delivered/read
    // if (message.receiver.toString() !== req.user.id) { ... }

    message.status = status;
    await message.save();

    res.json({
      success: true,
      message: "Status updated successfully",
      data: message,
    });
  } catch (error) {
    console.error("updateMessageStatus error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update message status",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// ============================================
// Delete message by ID
// DELETE /api/messages/:messageId
// ============================================
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.id;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this message",
      });
    }

    if (message.image && message.image.includes("cloudinary")) {
      try {
        const publicId = message.image.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`whispr/messages/${publicId}`);
      } catch (err) {
        console.warn("Could not delete image:", err.message);
      }
    }

    await Message.findByIdAndDelete(messageId);

    res.json({
      success: true,
      message: "Message deleted",
    });
  } catch (error) {
    console.error("deleteMessage error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

module.exports = {
  getRecentContacts,
  getMessages,
  sendMessage,
  markAsRead,
  uploadMessageImage,
  updateMessageStatus,
  deleteMessage,
};
