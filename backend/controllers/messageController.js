// backend/controllers/messageController.js
const mongoose = require("mongoose");
const Message = require("../models/message");
const { cloudinary } = require("../config/cloudinary");
const DOMPurify = require("isomorphic-dompurify");

// Named constants
const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_MESSAGE_LENGTH = 5000;

// ============================================
// Get recent contacts for sidebar
// GET /api/messages/recent
// ============================================
const getRecentContacts = async (req, res) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.id);

    const contacts = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: currentUserId }, { receiver: currentUserId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          contactId: {
            $cond: {
              if: { $eq: ["$sender", currentUserId] },
              then: "$receiver",
              else: "$sender",
            },
          },
          message: 1,
          image: 1,
          status: 1,
          receiver: 1,
          createdAt: 1,
          isDeleted: 1,
        },
      },
      {
        $group: {
          _id: "$contactId",
          lastMessage: {
            $first: {
              $cond: {
                if: { $eq: ["$isDeleted", true] },
                then: "This message was deleted",
                else: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ["$message", ""] },
                        { $ne: ["$message", null] },
                      ],
                    },
                    then: "$message",
                    else: {
                      $cond: {
                        if: { $ne: ["$image", null] },
                        then: "[Image]",
                        else: "",
                      },
                    },
                  },
                },
              },
            },
          },
          lastMessageAt: { $first: "$createdAt" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", currentUserId] },
                    { $ne: ["$status", "read"] },
                    { $ne: ["$isDeleted", true] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "contactInfo",
        },
      },
      { $unwind: "$contactInfo" },
      {
        $project: {
          _id: "$contactInfo._id",
          name: "$contactInfo.name",
          email: "$contactInfo.email",
          avatar: "$contactInfo.avatar",
          lastMessage: 1,
          lastMessageAt: 1,
          unreadCount: 1,
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ]);

    res.json({
      success: true,
      contacts,
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
// Get messages between two users (Cursor Paginated)
// GET /api/messages/:userId?limit=30&before=timestamp
// ============================================
const getMessages = async (req, res) => {
  try {
    const { userId } = req.params; // other user
    const currentUserId = req.user.id; // current user
    const { limit = 30, before } = req.query;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    const query = {
      $or: [
        { sender: currentUserId, receiver: userId },
        { sender: userId, receiver: currentUserId },
      ],
    };

    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 30, 1), 100);

    const rawMessages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .populate("sender", "name email avatar")
      .populate("receiver", "name email avatar");

    const messages = rawMessages.reverse().map((msgDoc) => {
      const msg = msgDoc.toObject ? msgDoc.toObject() : { ...msgDoc };
      if (msg.isDeleted) {
        msg.message = "";
        msg.image = null;
      }
      return msg;
    });

    // mark all unread messages from other user as read
    await Message.updateMany(
      {
        sender: userId,
        receiver: currentUserId,
        status: { $ne: "read" },
        isDeleted: { $ne: true },
      },
      { status: "read" }
    );

    res.json({
      success: true,
      messages,
      hasMore: rawMessages.length === parsedLimit,
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

    // Sanitize message content against XSS
    const sanitizedMessage = message ? DOMPurify.sanitize(message) : "[Image]";

    const newMsg = await Message.create({
      sender: senderId,
      receiver: receiverId,
      message: sanitizedMessage,
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
        isDeleted: { $ne: true },
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

          // Broadcast via Socket server to recipient and update contact lists
          const io = req.app.get("io");
          if (io) {
            const receiverIdStr = receiverId.toString();
            const senderIdStr = senderId.toString();
            io.to(receiverIdStr).emit("receiveMessage", msgDoc.toObject());
            io.to(receiverIdStr).emit("updateRecentContacts");
            io.to(senderIdStr).emit("updateRecentContacts");
          }

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

    // IDOR Check: Ensure current user is sender or receiver
    const currentUserIdStr = req.user.id.toString();
    if (
      message.sender.toString() !== currentUserIdStr &&
      message.receiver.toString() !== currentUserIdStr
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update status of this message",
      });
    }

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
    const currentUserId = String(req.user?._id || req.user?.id || req.user);
    console.log('// DEBUG-REMOVE [Controller] deleteMessage received:', { messageId, currentUserId });

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const messageSenderId = (message.sender?._id || message.sender).toString();
    if (messageSenderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this message",
      });
    }

    if (message.image && message.image.includes("cloudinary")) {
      try {
        const matches = message.image.match(/whispr\/messages\/[^.]+/);
        const publicId = matches
          ? matches[0]
          : `whispr/messages/${message.image.split("/").pop().split(".")[0]}`;
        await cloudinary.uploader.destroy(publicId);
      } catch (err) {
        console.warn("Could not delete image:", err.message);
      }
    }

    message.isDeleted = true;
    message.message = "";
    message.image = null;
    await message.save();

    // Broadcast deletion in real-time to both rooms and update recent contacts
    const io = req.app.get("io");
    if (io) {
      const senderIdStr = (message.sender?._id || message.sender).toString();
      const receiverIdStr = (message.receiver?._id || message.receiver).toString();
      const messageIdStr = message._id.toString();

      console.log('// DEBUG-REMOVE [Socket Emit] messageDeleted fired to rooms:', { senderIdStr, receiverIdStr, messageIdStr });

      io.to(senderIdStr).emit("messageDeleted", {
        messageId: messageIdStr,
        conversationWith: receiverIdStr,
      });
      io.to(receiverIdStr).emit("messageDeleted", {
        messageId: messageIdStr,
        conversationWith: senderIdStr,
      });

      io.to(senderIdStr).emit("updateRecentContacts");
      io.to(receiverIdStr).emit("updateRecentContacts");
    }

    return res.json({
      success: true,
      message: "Message deleted",
      data: {
        messageId: message._id,
        isDeleted: true,
      },
    });
  } catch (error) {
    console.error("deleteMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

// ============================================
// Edit message by ID
// PATCH /api/messages/:messageId/edit
// body: { message: string }
// ============================================
const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = String(req.user?._id || req.user?.id || req.user);
    const rawMessage = req.body.message !== undefined ? req.body.message : req.body.text;
    console.log('// DEBUG-REMOVE [Controller] editMessage received:', { messageId, currentUserId, rawMessage });

    if (rawMessage === undefined || rawMessage === null) {
      return res.status(400).json({
        success: false,
        message: "Message text is required",
      });
    }

    const trimmed = String(rawMessage).trim();
    if (!trimmed) {
      return res.status(400).json({
        success: false,
        message: "Message text cannot be empty",
      });
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Only the sender can edit
    const messageSenderId = (message.sender?._id || message.sender).toString();
    if (messageSenderId !== currentUserId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to edit this message",
      });
    }

    // Message must not be deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a deleted message",
      });
    }

    // Only messages that have text can be edited (image-only messages cannot)
    if (!message.message || message.message === "[Image]" || !message.message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Only text messages can be edited",
      });
    }

    // Enforce edit window of 15 minutes from createdAt (or timestamp / ObjectId fallback)
    const rawCreatedAt = message.createdAt || message.timestamp || (message._id?.getTimestamp ? message._id.getTimestamp() : null);
    const createdAtTime = rawCreatedAt ? new Date(rawCreatedAt).getTime() : Date.now();
    if (Date.now() - createdAtTime > EDIT_WINDOW_MS) {
      return res.status(400).json({
        success: false,
        message: "Edit window has expired (15 minutes limit)",
      });
    }

    // Sanitize with DOMPurify
    const sanitized = DOMPurify.sanitize(trimmed);
    if (!sanitized.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content is invalid",
      });
    }

    message.message = sanitized;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    // Broadcast edit in real-time to both rooms and update recent contacts
    const io = req.app.get("io");
    if (io) {
      const senderIdStr = (message.sender?._id || message.sender).toString();
      const receiverIdStr = (message.receiver?._id || message.receiver).toString();
      const messageIdStr = message._id.toString();

      console.log('// DEBUG-REMOVE [Socket Emit] messageEdited fired to rooms:', { senderIdStr, receiverIdStr, messageIdStr, text: message.message });

      const editPayload = {
        messageId: messageIdStr,
        message: message.message,
        isEdited: true,
        editedAt: message.editedAt,
      };

      io.to(senderIdStr).emit("messageEdited", editPayload);
      io.to(receiverIdStr).emit("messageEdited", editPayload);

      io.to(senderIdStr).emit("updateRecentContacts");
      io.to(receiverIdStr).emit("updateRecentContacts");
    }

    return res.json({
      success: true,
      message: "Message updated successfully",
      data: {
        messageId: message._id,
        message: message.message,
        isEdited: message.isEdited,
        editedAt: message.editedAt,
      },
    });
  } catch (error) {
    console.error("editMessage error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to edit message",
      error: process.env.NODE_ENV === "development" ? error.message : null,
    });
  }
};

module.exports = {
  EDIT_WINDOW_MS,
  MAX_MESSAGE_LENGTH,
  getRecentContacts,
  getMessages,
  sendMessage,
  markAsRead,
  uploadMessageImage,
  updateMessageStatus,
  deleteMessage,
  editMessage,
};
