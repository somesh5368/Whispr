// backend/routes/messageRoutes.js

const express = require("express");
const router = express.Router();

const {
  sendMessage,
  getMessages,
  getRecentContacts,
  markAsRead,
  uploadMessageImage,
  updateMessageStatus,
  deleteMessage,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// Send text message (image should be URL/base64 in body if used)
router.post("/send", protect, sendMessage);

// Upload image and create image message
router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  uploadMessageImage
);

// Get recent contacts for sidebar
router.get("/recent", protect, getRecentContacts);

// Get messages between current user and another user
router.get("/:userId", protect, getMessages);

// Mark messages from a specific user as read
router.patch("/:userId/read", protect, markAsRead);

// Update message status
router.put("/:messageId/status", protect, updateMessageStatus);

// Delete message
router.delete("/:messageId", protect, deleteMessage);

module.exports = router;
