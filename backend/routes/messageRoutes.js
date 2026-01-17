// backend/routes/messageRoutes.js

const express = require("express");
const router = express.Router();

const messageController = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");

// Send a message via REST (for starting chat / tests)
router.post("/", protect, messageController.sendMessage);

// Get recent contacts for sidebar
router.get(
  "/recent/contacts",
  protect,
  messageController.getRecentContacts
);

// Mark all messages from a contact as read
router.post(
  "/mark-read/:contactId",
  protect,
  messageController.markChatRead
);

// Get chat messages between two users
router.get(
  "/:senderId/:receiverId",
  protect,
  messageController.getMessages
);

// Upload chat image (multer in memory -> Cloudinary)
router.post(
  "/upload-image",
  protect,
  upload.single("image"),
  messageController.uploadMessageImage
);

module.exports = router;
