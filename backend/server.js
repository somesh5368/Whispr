// backend/server.js

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const socketHandler = require("./sockets/socketHandler");

// Load environment variables from .env
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Allowed frontend origins (dev + prod)
const allowedOrigins = [
  "http://localhost:5173",       // Vite dev
  "http://localhost:3000",       // optional dev
  process.env.FRONTEND_URL,      // e.g. https://whispr-frontend.vercel.app
].filter(Boolean);

// CORS middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// JSON body parser
app.use(express.json());

// REST API routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Health check / root route
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 Whispr backend is running!",
    status: "OK",
    timestamp: new Date().toISOString()
  });
});

// Create HTTP server and bind Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Setup socket events
socketHandler(io);

// Export io so controllers can emit events
module.exports.io = io;

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
