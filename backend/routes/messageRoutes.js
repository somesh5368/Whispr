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
  editMessage,
} = require("../controllers/messageController");

const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  validate,
  sendMessageSchema,
  uploadImageBodySchema,
  editMessageSchema,
  updateMessageStatusSchema,
  userIdParamSchema,
  messageIdParamSchema,
  getMessagesQuerySchema,
} = require("../validators");

const {
  messageActionLimiter,
  uploadLimiter,
} = require("../config/rateLimiters");

// Send text message (rate limited & validated)
router.post(
  "/send",
  protect,
  messageActionLimiter,
  validate({ body: sendMessageSchema }),
  sendMessage
);

// Upload image and create image message (multer errors → 400)
function handleUploadError(err, req, res, next) {
  if (!err) return next();
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File size must be less than 5MB" });
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE" || (err.message && err.message.includes("Invalid file type"))) {
    return res.status(400).json({ success: false, message: err.message || "Invalid file type" });
  }
  next(err);
}

router.post(
  "/upload-image",
  protect,
  uploadLimiter,
  upload.single("image"),
  handleUploadError,
  validate({ body: uploadImageBodySchema }),
  uploadMessageImage
);

// Get recent contacts for sidebar
router.get("/recent", protect, getRecentContacts);

// Get messages between current user and another user
router.get(
  "/:userId",
  protect,
  validate({ params: userIdParamSchema, query: getMessagesQuerySchema }),
  getMessages
);

// Mark messages from a specific user as read
router.patch("/:userId/read", protect, validate({ params: userIdParamSchema }), markAsRead);

// Edit message (rate limited & validated)
router.patch(
  "/:messageId/edit",
  protect,
  messageActionLimiter,
  validate({ params: messageIdParamSchema, body: editMessageSchema }),
  editMessage
);

// Update message status
router.put(
  "/:messageId/status",
  protect,
  validate({ params: messageIdParamSchema, body: updateMessageStatusSchema }),
  updateMessageStatus
);

// Delete message (rate limited & validated)
router.delete(
  "/:messageId",
  protect,
  messageActionLimiter,
  validate({ params: messageIdParamSchema }),
  deleteMessage
);

module.exports = router;
