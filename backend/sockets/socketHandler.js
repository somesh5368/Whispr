const Message = require('../models/message');

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client:', socket.id);

    // Join personal room
    socket.on('join', (userId) => {
      socket.join(userId);
      console.log(`User ${userId} joined room`);
    });

    // 1️⃣ Send message
    socket.on('send_message', async ({ senderId, receiverId, message }) => {
      try {
        const newMsg = await Message.create({
          senderId,
          receiverId,
          message,
          status: 'sent',
        });

        // Send message to both receiver and sender
        io.to(receiverId).emit('receive_message', newMsg);
        io.to(senderId).emit('receive_message', newMsg);
      } catch (err) {
        console.error('send_message error:', err.message);
      }
    });

    // 2️⃣ Delivered
    socket.on('message_delivered', async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status === 'sent') {
          msg.status = 'delivered';
          await msg.save();
          io.to(senderId).emit('update_status', { messageId, status: 'delivered' });
        }
      } catch (err) {
        console.error('message_delivered error:', err.message);
      }
    });

    // 3️⃣ Read
    socket.on('message_read', async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status !== 'read') {
          msg.status = 'read';
          await msg.save();
          io.to(senderId).emit('update_status', { messageId, status: 'read' });
        }
      } catch (err) {
        console.error('message_read error:', err.message);
      }
    });
  });
};

module.exports = socketHandler;
