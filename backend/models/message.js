const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    senderId:  { type: String, required: true },
    receiverId:{ type: String, required: true },
    message:   { type: String, required: true },
    status:    { type: String, enum: ['sent', 'delivered', 'read'], default: 'sent' },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.Message || mongoose.model('Message', messageSchema);
