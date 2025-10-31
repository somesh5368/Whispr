const Message = require('../models/message');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client:', socket.id);

    // Join personal room
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    // Leave personal room (optional: add for cleanup)
    socket.on('leave', (userId) => {
      socket.leave(userId);
      console.log(`User ${userId} left room`);
    });

    // 1️⃣ Send message (support image/attachments if needed)
    socket.on('send_message', async ({ senderId, receiverId, message, image }) => {
      try {
        const newMsg = await Message.create({
          senderId,
          receiverId,
          message,
          image,           // optional field for photo sharing
          status: 'sent',
        });

        // Send message to both receiver and sender
        io.to(receiverId).emit('receive_message', newMsg);
        io.to(senderId).emit('receive_message', newMsg);

        // 🔔 Dynamic recent contacts update
        io.to(receiverId).emit('updateRecentContacts');
        io.to(senderId).emit('updateRecentContacts');
      } catch (err) {
        console.error('send_message error:', err.message);
      }
    });

    // 2️⃣ Delivered status
    socket.on('message_delivered', async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status === 'sent') {
          msg.status = 'delivered';
          await msg.save();
          io.to(senderId).emit('message_delivered', { messageId, status: 'delivered' });
        }
      } catch (err) {
        console.error('message_delivered error:', err.message);
      }
    });

    // 3️⃣ Read status
    socket.on('message_read', async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status !== 'read') {
          msg.status = 'read';
          await msg.save();
          io.to(senderId).emit('message_read', { messageId, status: 'read' });
        }
      } catch (err) {
        console.error('message_read error:', err.message);
      }
    });
  });
};

module.exports = socketHandler;
