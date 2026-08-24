// backend/models/message.js (or Message.js)

const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      default: "",
    },
    image: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    clientId: {
      type: String,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound indexes for fast query performance
messageSchema.index({ sender: 1, receiver: 1, isDeleted: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, status: 1, isDeleted: 1 });

// ✅ fix OverwriteModelError with nodemon
const Message =
  mongoose.models.Message || mongoose.model("Message", messageSchema);

module.exports = Message;
