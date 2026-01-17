// backend/sockets/socketHandler.js
const Message = require("../models/message");

const onlineUsers = new Set();

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 New client:", socket.id);

    // Join room
    socket.on("join", (userId) => {
      if (!userId) return;
      socket.join(userId);
      onlineUsers.add(userId);
      io.emit("userOnline", userId);
    });

    socket.on("leave", (userId) => {
      if (!userId) return;
      socket.leave(userId);
      onlineUsers.delete(userId);
      io.emit("userOffline", userId);
    });

    // Real-time message handler
    socket.on("sendMessage", async (data) => {
      try {
        const {
          senderId,
          receiverId,
          message,
          image,
          timestamp,
          clientId,
        } = data;

        if (!senderId || !receiverId) return;

        const newMsg = await Message.create({
          senderId,
          receiverId,
          message,
          image,
          status: "sent",
          timestamp: timestamp || Date.now(),
          clientId,
        });

        // Send to both users (rooms are userId)
        io.to(receiverId).emit("receiveMessage", newMsg);
        io.to(senderId).emit("receiveMessage", newMsg);

        // Tell both users to refresh recent contacts
        io.to(receiverId).emit("updateRecentContacts");
        io.to(senderId).emit("updateRecentContacts");
      } catch (err) {
        console.error("sendMessage error:", err.message);
      }
    });

    // Message delivered
    socket.on("messageDelivered", async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status === "sent") {
          msg.status = "delivered";
          await msg.save();
          io.to(senderId).emit("messageDelivered", messageId);
        }
      } catch (err) {
        console.error("messageDelivered error:", err.message);
      }
    });

    // Message read
    socket.on("messageRead", async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findById(messageId);
        if (msg && msg.status !== "read") {
          msg.status = "read";
          await msg.save();
          io.to(senderId).emit("messageRead", messageId);
        }
      } catch (err) {
        console.error("messageRead error:", err.message);
      }
    });

    // Typing indicator
    socket.on("typing", ({ to, from }) => {
      if (!to || !from) return;
      io.to(to).emit("typing", { from });
    });

    socket.on("stopTyping", ({ to, from }) => {
      if (!to || !from) return;
      io.to(to).emit("stopTyping", { from });
    });

    socket.on("disconnect", () => {
      console.log("❌ Client disconnected:", socket.id);
    });
  });
};

module.exports = socketHandler;
