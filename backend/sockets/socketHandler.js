const Message = require('../models/message');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client:', socket.id);

    socket.on('join', (userId) => {
      socket.join(userId);
    });

    socket.on('leave', (userId) => {
      socket.leave(userId);
    });

    // 1️⃣ Real-time message handler
    socket.on('sendMessage', async ({ senderId, receiverId, message, image }) => {
      try {
        const newMsg = await Message.create({
          senderId,
          receiverId,
          message,
          image,
          status: 'sent'
        });

        // Real-time delivery to both
        io.to(receiverId).emit('receiveMessage', newMsg);
        io.to(senderId).emit('receiveMessage', newMsg);

        // Update contacts list for both
        io.to(receiverId).emit('updateRecentContacts');
        io.to(senderId).emit('updateRecentContacts');
      } catch (err) {
        console.error('sendMessage error:', err.message);
      }
    });

    // 2️⃣ Message delivered
    socket.on('messageDelivered', async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status === 'sent') {
          msg.status = 'delivered';
          await msg.save();
          io.to(senderId).emit('messageDelivered', { messageId, status: 'delivered' });
        }
      } catch (err) {
        console.error('messageDelivered error:', err.message);
      }
    });

    // 3️⃣ Message read
    socket.on('messageRead', async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status !== 'read') {
          msg.status = 'read';
          await msg.save();
          io.to(senderId).emit('messageRead', { messageId, status: 'read' });
        }
      } catch (err) {
        console.error('messageRead error:', err.message);
      }
    });
  });
};

module.exports = socketHandler;
