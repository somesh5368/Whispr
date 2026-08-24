// backend/server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const connectDB = require("./config/db");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");
const socketHandler = require("./sockets/socketHandler");

console.log("📋 Environment Check:");
console.log(`MongoDB: ${process.env.MONGO_URI ? "✅" : "❌"}`);
console.log(`JWT Secret: ${process.env.JWT_SECRET ? "✅" : "❌"}`);
console.log(
  `Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? "✅" : "❌"}`
);

// Connect to MongoDB
connectDB();

const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// Security Headers
app.use(helmet({ contentSecurityPolicy: false }));

// Rate limiter for Auth routes (15 requests per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// CORS Configuration
// ============================================
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
  : [
      "http://localhost:5173",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://whispr-nine.vercel.app",
      process.env.FRONTEND_URL,
    ].filter(Boolean);

if (process.env.NODE_ENV !== "production") {
  console.log("✅ Allowed Origins:", allowedOrigins);
}

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Apply rate limiter to sensitive auth endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

// Health check endpoints
const handleHealthCheck = (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "Whispr backend is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
};

app.get("/", handleHealthCheck);
app.get("/health", handleHealthCheck);

// ============================================
// Socket.IO Setup
// ============================================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  },
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
});

// Attach io instance to app
app.set("io", io);

// Socket handlers
socketHandler(io);

// ============================================
// Error Handling Middleware
// ============================================
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Server Error",
    error: process.env.NODE_ENV === "development" ? err : {},
  });
});

// ============================================
// Start Server
// ============================================
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║ 🚀 Whispr Server Started Successfully │
╠════════════════════════════════════════╣
║ Environment: ${NODE_ENV}
║ Port: ${PORT}
║ Frontend: ${process.env.FRONTEND_URL || "Not configured"}
║ WebSocket: Active
╚════════════════════════════════════════╝
`);
});

// Graceful Shutdown
const mongoose = require("mongoose");

const gracefulShutdown = (signal) => {
  console.log(`${signal} received, shutting down gracefully...`);
  io.close(() => console.log("Socket.IO connections closed"));
  server.close(async () => {
    console.log("HTTP server closed");
    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed");
    } catch (err) {
      console.error("Error closing MongoDB connection:", err.message);
    }
    process.exit(0);
  });
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Error handling
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err);
  process.exit(1);
});

module.exports = { app, server, io };
