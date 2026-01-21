const Message = require('../models/message');

const onlineUsers = new Set();
const userSocketMap = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('✅ New client connected:', socket.id);

    // ============================================
    // Join User Room
    // ============================================
    socket.on('join', (userId) => {
      if (!userId) {
        console.warn('❌ Join event: userId missing');
        return;
      }

      const userIdStr = userId.toString();
      socket.join(userIdStr);
      userSocketMap.set(userIdStr, socket.id);
      onlineUsers.add(userIdStr);

      console.log(`👤 User ${userIdStr} joined. Online users: ${onlineUsers.size}`);

      // Broadcast user online status
      io.emit('userOnline', userIdStr);
    });

    // ============================================
    // Leave User Room
    // ============================================
    socket.on('leave', (userId) => {
      if (!userId) return;

      const userIdStr = userId.toString();
      socket.leave(userIdStr);
      userSocketMap.delete(userIdStr);
      onlineUsers.delete(userIdStr);

      console.log(`👋 User ${userIdStr} left. Online users: ${onlineUsers.size}`);
      io.emit('userOffline', userIdStr);
    });

    // ============================================
    // Send Message
    // ============================================
    socket.on('sendMessage', async (data) => {
      try {
        const { senderId, receiverId, message, image, timestamp, clientId } = data;

        if (!senderId || !receiverId) {
          console.warn('❌ sendMessage: Missing senderId or receiverId');
          return;
        }

        // Create message in DB
        const newMsg = await Message.create({
          sender: senderId,
          receiver: receiverId,
          message,
          image: image || null,
          status: 'sent',
          timestamp: timestamp || Date.now(),
          clientId,
        });

        // Populate sender info
        await newMsg.populate('sender', 'name email avatar');

        // Send to both users
        const receiverIdStr = receiverId.toString();
        const senderIdStr = senderId.toString();

        io.to(receiverIdStr).emit('receiveMessage', {
          ...newMsg.toObject(),
          clientId,
        });

        io.to(senderIdStr).emit('receiveMessage', newMsg.toObject());

        // Tell both users to refresh recent contacts
        io.to(receiverIdStr).emit('updateRecentContacts');
        io.to(senderIdStr).emit('updateRecentContacts');

        console.log(`📨 Message from ${senderIdStr} to ${receiverIdStr}`);
      } catch (err) {
        console.error('❌ sendMessage error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ============================================
    // Message Delivered
    // ============================================
    socket.on('messageDelivered', async (data) => {
      try {
        const { messageId, senderId } = data;

        const msg = await Message.findByIdAndUpdate(
          messageId,
          { status: 'delivered' },
          { new: true }
        );

        if (msg) {
          const senderIdStr = senderId.toString();
          io.to(senderIdStr).emit('messageDelivered', {
            messageId,
            status: 'delivered',
          });
          console.log(`✅ Message ${messageId} delivered`);
        }
      } catch (err) {
        console.error('❌ messageDelivered error:', err.message);
      }
    });

    // ============================================
    // Message Read
    // ============================================
    socket.on('messageRead', async (data) => {
      try {
        const { messageId, senderId } = data;

        const msg = await Message.findByIdAndUpdate(
          messageId,
          { status: 'read' },
          { new: true }
        );

        if (msg) {
          const senderIdStr = senderId.toString();
          io.to(senderIdStr).emit('messageRead', {
            messageId,
            status: 'read',
          });
          console.log(`👁️ Message ${messageId} read`);
        }
      } catch (err) {
        console.error('❌ messageRead error:', err.message);
      }
    });

    // ============================================
    // Typing Indicator
    // ============================================
    socket.on('typing', (data) => {
      const { to, from, isTyping } = data;

      if (!to || !from) return;

      io.to(to.toString()).emit('userTyping', {
        from: from.toString(),
        isTyping,
      });
    });

    // ============================================
    // Disconnect
    // ============================================
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);

      // Find and remove user from online users
      for (const [userId, socketId] of userSocketMap.entries()) {
        if (socketId === socket.id) {
          onlineUsers.delete(userId);
          userSocketMap.delete(userId);
          io.emit('userOffline', userId);
          console.log(`👋 User ${userId} went offline`);
          break;
        }
      }
    });
  });
};

module.exports = socketHandler;
