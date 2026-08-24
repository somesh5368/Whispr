// backend/sockets/socketHandler.js
const Message = require("../models/message");
const DOMPurify = require("isomorphic-dompurify");
const { socketAuthMiddleware } = require("../middleware/authMiddleware");

// Map<userIdString, Set<socketId>> to support multi-tab connections
const userSocketsMap = new Map();

const socketHandler = (io) => {
  // Enforce JWT handshake authentication for WebSockets
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log("New authenticated client connected:", socket.id, "User ID:", socket.userId);

    // Track rate-limiting timestamps per socket (max 3 msgs / 1 sec)
    socket.messageTimestamps = [];

    // ========== Join/Leave Events ==========
    socket.on("join", (data) => {
      const userId = socket.userId || (data && (typeof data === "object" ? data.userId : data));
      if (!userId) {
        console.warn("Join event: userId missing");
        return;
      }

      const userIdStr = userId.toString();
      socket.join(userIdStr);

      if (!userSocketsMap.has(userIdStr)) {
        userSocketsMap.set(userIdStr, new Set());
      }
      const userSockets = userSocketsMap.get(userIdStr);
      const wasOffline = userSockets.size === 0;
      userSockets.add(socket.id);

      console.log(`User ${userIdStr} joined on socket ${socket.id}. Active sockets for user: ${userSockets.size}`);

      // Broadcast user online status only on first active socket
      if (wasOffline) {
        io.emit("userOnline", { userId: userIdStr });
      }
    });

    socket.on("leave", (data) => {
      const userId = socket.userId || (data && (typeof data === "object" ? data.userId : data));
      if (!userId) return;

      const userIdStr = userId.toString();
      socket.leave(userIdStr);

      if (userSocketsMap.has(userIdStr)) {
        const userSockets = userSocketsMap.get(userIdStr);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(userIdStr);
          console.log(`User ${userIdStr} left all sessions. Marked offline.`);
          io.emit("userOffline", { userId: userIdStr });
        }
      }
    });

    // ========== Message Events ==========
    socket.on("sendMessage", async (data) => {
      try {
        const senderId = socket.userId || data.senderId;
        const { receiverId, message, image, timestamp, clientId } = data;

        if (!senderId || !receiverId) {
          console.warn("sendMessage: Missing senderId or receiverId");
          return;
        }

        // Per-socket rate throttling (max 3 messages per 1 second window)
        const now = Date.now();
        socket.messageTimestamps = (socket.messageTimestamps || []).filter(
          (ts) => now - ts < 1000
        );

        if (socket.messageTimestamps.length >= 3) {
          console.warn(`Socket ${socket.id} rate limit exceeded for sendMessage`);
          socket.emit("error", { message: "Rate limit exceeded. Slow down your messages." });
          return;
        }
        socket.messageTimestamps.push(now);

        // Sanitize message content against XSS
        const sanitizedMessage = message ? DOMPurify.sanitize(message) : "";

        // Create message in database first, then populate asynchronously
        const newMsg = await Message.create({
          sender: senderId,
          receiver: receiverId,
          message: sanitizedMessage,
          image: image || null,
          status: "sent",
          timestamp: timestamp || Date.now(),
          clientId,
        });

        await newMsg.populate("sender", "name email avatar");

        // Send to receiver
        const receiverIdStr = receiverId.toString();
        const senderIdStr = senderId.toString();

        io.to(receiverIdStr).emit("receiveMessage", {
          ...newMsg.toObject(),
          clientId,
        });

        // Send confirmation to sender
        io.to(senderIdStr).emit("messageSent", {
          clientId,
          messageId: newMsg._id,
          status: "sent",
        });

        // Update recent contacts for both users
        io.to(receiverIdStr).emit("updateRecentContacts");
        io.to(senderIdStr).emit("updateRecentContacts");

        console.log(`Message from ${senderIdStr} to ${receiverIdStr}`);
      } catch (err) {
        console.error("sendMessage error:", err.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ========== Message Status Events ==========
    socket.on("messageDelivered", async (data) => {
      try {
        const { messageId, senderId } = data;

        const msg = await Message.findByIdAndUpdate(
          messageId,
          { status: "delivered" },
          { new: true }
        );

        if (msg && senderId) {
          const senderIdStr = senderId.toString();
          io.to(senderIdStr).emit("messageDelivered", {
            messageId,
            status: "delivered",
          });
        }
      } catch (err) {
        console.error("messageDelivered error:", err.message);
      }
    });

    socket.on("messageRead", async (data) => {
      try {
        const { messageId, senderId } = data;

        const msg = await Message.findByIdAndUpdate(
          messageId,
          { status: "read" },
          { new: true }
        );

        if (msg && senderId) {
          const senderIdStr = senderId.toString();
          io.to(senderIdStr).emit("messageRead", {
            messageId,
            status: "read",
          });
        }
      } catch (err) {
        console.error("messageRead error:", err.message);
      }
    });

    // ========== Typing Indicator ==========
    socket.on("typing", (data) => {
      const { to, from, isTyping } = data;

      if (!to || !from) return;

      io.to(to.toString()).emit("userTyping", {
        from: from.toString(),
        isTyping,
      });
    });

    // ========== Disconnect ==========
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);

      for (const [userId, sockets] of userSocketsMap.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSocketsMap.delete(userId);
            io.emit("userOffline", { userId });
            console.log(`User ${userId} went offline (all tabs closed)`);
          } else {
            console.log(`User ${userId} tab closed. Remaining active sockets: ${sockets.size}`);
          }
          break;
        }
      }
    });
  });
};

module.exports = socketHandler;

