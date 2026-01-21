const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadProfile");

// ============================================
// Message Routes
// ============================================

// Get recent contacts for sidebar (Protected)
router.get(
  "/recent-contacts",
  protect,
  messageController.getRecentContacts
);

// Get chat messages between two users (Protected)
router.get(
  "/:userId",
  protect,
  messageController.getMessages
);

// Send a message via REST (Protected)
router.post(
  "/send",
  protect,
  messageController.sendMessage
);

// Mark all messages from a contact as read (Protected)
router.post(
  "/mark-read/:userId",
  protect,
  messageController.markAsRead
);

// Upload chat image - Cloudinary (Protected)
router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  messageController.uploadMessageImage
);

// Delete a message (Protected)
router.delete(
  "/:messageId",
  protect,
  messageController.deleteMessage
);

module.exports = router;
