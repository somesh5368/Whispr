// backend/controllers/messageController.js

const Message = require("../models/message");
const User = require("../models/user");
const { io } = require("../server");
const { cloudinary } = require("../config/cloudinary");

// POST /api/messages
exports.sendMessage = async (req, res) => {
  try {
    const newMsg = await Message.create(req.body);

    // Notify both users to refresh recent contacts + deliver
    if (io && newMsg.senderId && newMsg.receiverId) {
      io.to(newMsg.senderId.toString()).emit("updateRecentContacts");
      io.to(newMsg.receiverId.toString()).emit("updateRecentContacts");
      io.to(newMsg.receiverId.toString()).emit("receiveMessage", newMsg);
    }

    return res.status(201).json(newMsg);
  } catch (err) {
    console.error("sendMessage error:", err);
    return res
      .status(500)
      .json({ message: "Send failed", error: err.message });
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

    // Mark unread messages as read (for receiver)
    const unreadMsgs = msgs.filter(
      (msg) =>
        msg.receiverId.toString() === receiverId.toString() &&
        msg.status !== "read"
    );

    for (let msg of unreadMsgs) {
      msg.status = "read";
      await msg.save();

      if (io) {
        io.to(msg.senderId.toString()).emit("messageRead", {
          messageId: msg._id,
          status: "read",
        });
      }
    }

    return res.json(msgs);
  } catch (err) {
    console.error("getMessages error:", err);
    return res
      .status(500)
      .json({ message: "Fetch failed", error: err.message });
  }
};

// POST /api/messages/mark-read/:contactId
exports.markChatRead = async (req, res) => {
  try {
    const userId = req.user._id; // current user
    const contactId = req.params.contactId;

    const result = await Message.updateMany(
      {
        senderId: contactId,
        receiverId: userId,
        status: { $ne: "read" },
      },
      { $set: { status: "read" } }
    );

    // send read events for ticks
    if (io) {
      const updatedMsgs = await Message.find({
        senderId: contactId,
        receiverId: userId,
      }).select("_id senderId receiverId status");

      updatedMsgs.forEach((msg) => {
        io.to(msg.senderId.toString()).emit("messageRead", {
          messageId: msg._id,
          status: "read",
        });
      });
    }

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (err) {
    console.error("markChatRead error:", err);
    return res
      .status(500)
      .json({ message: "Mark read failed", error: err.message });
  }
};

// GET /api/messages/recent/contacts
exports.getRecentContacts = async (req, res) => {
  const userId = req.user._id;

  try {
    const messages = await Message.find({
      $or: [{ senderId: userId }, { receiverId: userId }],
    }).sort({ createdAt: -1 });

    if (!messages || messages.length === 0) {
      return res.status(200).json([]);
    }

    const contactMap = {};

    messages.forEach((msg) => {
      const contactId =
        msg.senderId.toString() === userId.toString()
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      if (
        !contactMap[contactId] ||
        new Date(msg.createdAt) > new Date(contactMap[contactId].createdAt)
      ) {
        contactMap[contactId] = msg;
      }
    });

    const sortedContactIds = Object.keys(contactMap).sort(
      (a, b) =>
        new Date(contactMap[b].createdAt) -
        new Date(contactMap[a].createdAt)
    );

    const contacts = await User.find({
      _id: { $in: sortedContactIds },
    }).select("-password");

    const contactsSorted = sortedContactIds
      .map((id) => contacts.find((u) => u._id.toString() === id))
      .filter(Boolean);

    const contactsWithUnread = await Promise.all(
      contactsSorted.map(async (u) => {
        const unreadCount = await Message.countDocuments({
          senderId: u._id,
          receiverId: userId,
          status: { $ne: "read" },
        });

        return {
          ...u.toObject(),
          unreadCount,
        };
      })
    );

    return res.status(200).json(contactsWithUnread);
  } catch (error) {
    console.error("getRecentContacts error:", error);
    return res.status(500).json({
      message: "Failed to load contacts",
      error: error.message,
    });
  }
};

// POST /api/messages/upload-image
exports.uploadMessageImage = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ message: "No file provided" });
    }

    const { senderId, receiverId, clientId } = req.body;

    if (!senderId || !receiverId) {
      return res
        .status(400)
        .json({ message: "Missing senderId or receiverId" });
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "whispr/messages",
        resource_type: "image",
      },
      async (error, result) => {
        if (error || !result) {
          console.error("Cloudinary upload error:", error);
          return res.status(500).json({
            message: "Upload failed",
            error: error?.message || "Unknown error",
          });
        }

        const msgDoc = await Message.create({
          senderId,
          receiverId,
          message: "",
          image: result.secure_url,
          clientId,
        });

        if (io) {
          io.to(senderId.toString()).emit("updateRecentContacts");
          io.to(receiverId.toString()).emit("updateRecentContacts");
          io.to(receiverId.toString()).emit("receiveMessage", msgDoc);
        }

        return res.status(201).json(msgDoc);
      }
    );

    uploadStream.end(req.file.buffer);
  } catch (err) {
    console.error("uploadMessageImage error:", err);
    return res
      .status(500)
      .json({ message: "Upload failed", error: err.message });
  }
};
