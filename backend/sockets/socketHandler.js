// backend/sockets/socketHandler.js
const mongoose = require("mongoose");
const Message = require("../models/message");
const User = require("../models/user");
const DOMPurify = require("isomorphic-dompurify");
const { socketAuthMiddleware } = require("../middleware/authMiddleware");

const MAX_MESSAGE_LENGTH = 2000;

// Helper to validate that an image is hosted on our verified Cloudinary domain only
function isValidCloudinaryUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;
    if (parsed.hostname !== "res.cloudinary.com") return false;
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (cloudName) {
      return parsed.pathname.startsWith(`/${cloudName}/`);
    }
    return true;
  } catch {
    return false;
  }
}

// Map<userIdString, Set<socketId>> to support multi-tab connections
const userSocketsMap = new Map();

const socketHandler = (io) => {
  // Enforce JWT handshake authentication for WebSockets
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log("New authenticated client connected:", socket.id, "User ID:", socket.userId);

    // Track rate-limiting timestamps per socket (max 3 msgs / 1 sec)
    socket.messageTimestamps = [];

    // Automatically join room for authenticated user ID so they never miss personal notifications
    const authUserId = socket.userId ? socket.userId.toString() : null;
    if (authUserId) {
      socket.join(authUserId);
      if (!userSocketsMap.has(authUserId)) {
        userSocketsMap.set(authUserId, new Set());
      }
      const userSockets = userSocketsMap.get(authUserId);
      const wasOffline = userSockets.size === 0;
      userSockets.add(socket.id);
      if (wasOffline) {
        io.emit("userOnline", { userId: authUserId });
      }
      console.log(`// DEBUG-REMOVE [Socket] User ${authUserId} automatically joined room on connect (${socket.id})`);
    }

    // Send connecting client the list of currently online user IDs from userSocketsMap
    socket.emit("onlineUsers", Array.from(userSocketsMap.keys()));

    // ========== Join/Leave Events ==========
    socket.on("join", (data) => {
      // TASK 1: Never trust client-supplied userId. Use verified socket.userId from JWT only.
      const currentUserId = socket.userId ? socket.userId.toString() : null;
      if (!currentUserId) {
        socket.emit("error", { message: "Authentication required" });
        return;
      }

      // Reject if client attempts to join another user's room
      const clientUserId = data && (typeof data === "object" ? data.userId : data);
      if (clientUserId && clientUserId.toString() !== currentUserId) {
        console.warn(`Security alert: Socket ${socket.id} (user ${currentUserId}) attempted to join unauthorized room ${clientUserId}`);
        socket.emit("error", { message: "Unauthorized room join attempt" });
        return;
      }

      socket.join(currentUserId);

      if (!userSocketsMap.has(currentUserId)) {
        userSocketsMap.set(currentUserId, new Set());
      }
      const userSockets = userSocketsMap.get(currentUserId);
      const wasOffline = userSockets.size === 0;
      userSockets.add(socket.id);

      console.log(`User ${currentUserId} joined on socket ${socket.id}. Active sockets: ${userSockets.size}`);

      if (wasOffline) {
        io.emit("userOnline", { userId: currentUserId });
      }

      socket.emit("onlineUsers", Array.from(userSocketsMap.keys()));
    });

    socket.on("getOnlineUsers", () => {
      socket.emit("onlineUsers", Array.from(userSocketsMap.keys()));
    });

    socket.on("leave", (data) => {
      // TASK 1: Only allow user to leave their own verified room
      const currentUserId = socket.userId ? socket.userId.toString() : null;
      if (!currentUserId) return;

      const clientUserId = data && (typeof data === "object" ? data.userId : data);
      if (clientUserId && clientUserId.toString() !== currentUserId) {
        console.warn(`Security alert: Socket ${socket.id} (user ${currentUserId}) attempted to leave unauthorized room ${clientUserId}`);
        return;
      }

      socket.leave(currentUserId);

      if (userSocketsMap.has(currentUserId)) {
        const userSockets = userSocketsMap.get(currentUserId);
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          userSocketsMap.delete(currentUserId);
          console.log(`User ${currentUserId} left all sessions. Marked offline.`);
          io.emit("userOffline", { userId: currentUserId });
        }
      }
    });

    // ========== Message Events ==========
    socket.on("sendMessage", async (data) => {
      try {
        // TASK 1: Force senderId from socket.userId verified JWT (never client data)
        const senderId = socket.userId ? socket.userId.toString() : null;
        if (!senderId) {
          socket.emit("error", { message: "Authentication required" });
          return;
        }

        const { receiverId, message, image, timestamp, clientId } = data || {};

        if (!receiverId || !mongoose.Types.ObjectId.isValid(receiverId)) {
          socket.emit("error", { message: "Valid receiver ID is required" });
          return;
        }

        const receiverIdStr = receiverId.toString();

        // Prevent self-messaging
        if (receiverIdStr === senderId) {
          socket.emit("error", { message: "Cannot send message to yourself" });
          return;
        }

        // Verify receiver user exists in database
        const receiverExists = await User.exists({ _id: receiverId });
        if (!receiverExists) {
          socket.emit("error", { message: "Receiver user not found" });
          return;
        }

        // Validate payload content & length
        const hasText = typeof message === "string" && message.trim().length > 0;
        const hasImage = image !== null && image !== undefined && typeof image === "string";

        if (!hasText && !hasImage) {
          socket.emit("error", { message: "Receiver ID and message or image are required" });
          return;
        }

        if (hasText && message.length > MAX_MESSAGE_LENGTH) {
          socket.emit("error", {
            message: `Message exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
          });
          return;
        }

        if (hasImage && !isValidCloudinaryUrl(image)) {
          socket.emit("error", {
            message: "Invalid image URL. Must be hosted on our Cloudinary domain.",
          });
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
        const sanitizedMessage = hasText ? DOMPurify.sanitize(message.trim()) : "";

        // Create message in database first, then populate asynchronously
        const newMsg = await Message.create({
          sender: senderId,
          receiver: receiverIdStr,
          message: sanitizedMessage,
          image: hasImage ? image : null,
          status: "sent",
          timestamp: timestamp || Date.now(),
          clientId,
        });

        await newMsg.populate("sender", "name email avatar");

        // Send to receiver
        io.to(receiverIdStr).emit("receiveMessage", {
          ...newMsg.toObject(),
          clientId,
        });

        // Send confirmation to sender
        io.to(senderId).emit("messageSent", {
          clientId,
          messageId: newMsg._id,
          status: "sent",
        });

        // Update recent contacts for both users
        io.to(receiverIdStr).emit("updateRecentContacts");
        io.to(senderId).emit("updateRecentContacts");

        console.log(`Message from ${senderId} to ${receiverIdStr}`);
      } catch (err) {
        console.error("sendMessage error:", err.message);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ========== Message Status Events ==========
    socket.on("messageDelivered", async (data) => {
      try {
        const messageId = typeof data === "object" && data !== null ? data.messageId : data;
        const currentUserId = socket.userId ? socket.userId.toString() : null;

        if (!currentUserId || !messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
          return;
        }

        // TASK 1: Load message and verify that socket.userId is the intended receiver
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const receiverId = (msg.receiver?._id || msg.receiver).toString();
        if (receiverId !== currentUserId) {
          console.warn(`Unauthorized messageDelivered attempt by user ${currentUserId} for message ${messageId}`);
          return;
        }

        if (msg.status !== "read" && msg.status !== "delivered") {
          msg.status = "delivered";
          await msg.save();
        }

        // Never trust client-supplied senderId; take sender from verified DB document
        const senderIdStr = (msg.sender?._id || msg.sender).toString();
        io.to(senderIdStr).emit("messageDelivered", {
          messageId: msg._id.toString(),
          status: "delivered",
        });
      } catch (err) {
        console.error("messageDelivered error:", err.message);
      }
    });

    socket.on("messageRead", async (data) => {
      try {
        const messageId = typeof data === "object" && data !== null ? data.messageId : data;
        const currentUserId = socket.userId ? socket.userId.toString() : null;

        if (!currentUserId || !messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
          return;
        }

        // TASK 1: Load message and verify that socket.userId is the intended receiver
        const msg = await Message.findById(messageId);
        if (!msg) return;

        const receiverId = (msg.receiver?._id || msg.receiver).toString();
        if (receiverId !== currentUserId) {
          console.warn(`Unauthorized messageRead attempt by user ${currentUserId} for message ${messageId}`);
          return;
        }

        if (msg.status !== "read") {
          msg.status = "read";
          await msg.save();
        }

        // Never trust client-supplied senderId; take sender from verified DB document
        const senderIdStr = (msg.sender?._id || msg.sender).toString();
        io.to(senderIdStr).emit("messageRead", {
          messageId: msg._id.toString(),
          status: "read",
        });
      } catch (err) {
        console.error("messageRead error:", err.message);
      }
    });

    // ========== Typing Indicator ==========
    socket.on("typing", (data) => {
      const { to, isTyping } = data || {};
      const from = socket.userId ? socket.userId.toString() : null;

      // TASK 1: Use socket.userId as from, validate to is a valid ObjectId
      if (!from || !to || !mongoose.Types.ObjectId.isValid(to)) return;

      io.to(to.toString()).emit("userTyping", {
        from,
        isTyping: Boolean(isTyping),
      });
    });

    socket.on("stopTyping", (data) => {
      const { to } = data || {};
      const from = socket.userId ? socket.userId.toString() : null;

      // TASK 1: Use socket.userId as from, validate to is a valid ObjectId
      if (!from || !to || !mongoose.Types.ObjectId.isValid(to)) return;

      io.to(to.toString()).emit("userTyping", {
        from,
        isTyping: false,
      });
      io.to(to.toString()).emit("stopTyping", {
        from,
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
