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

// Environment validation & fail-fast checks (Task 7)
const requiredEnvVars = [
  { name: "MONGO_URI", value: process.env.MONGO_URI },
  { name: "JWT_SECRET", value: process.env.JWT_SECRET },
  { name: "CLOUDINARY_CLOUD_NAME", value: process.env.CLOUDINARY_CLOUD_NAME },
  { name: "CLOUDINARY_API_KEY", value: process.env.CLOUDINARY_API_KEY },
  { name: "CLOUDINARY_API_SECRET", value: process.env.CLOUDINARY_API_SECRET },
];

const missingVars = requiredEnvVars
  .filter((item) => !item.value || item.value.trim() === "")
  .map((item) => item.name);

if (missingVars.length > 0) {
  console.error(
    `\n❌ FATAL: Missing required environment variable(s):\n  - ${missingVars.join(
      "\n  - "
    )}\nWhispr cannot start safely. Please configure these variables in your .env file.\n`
  );
  process.exit(1);
}

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn(
    `\n⚠️ SECURITY WARNING: JWT_SECRET length is ${process.env.JWT_SECRET.length} characters (< 32). A minimum length of 32 characters is strongly recommended.\n`
  );
}

// Connect to MongoDB
connectDB();

const helmet = require("helmet");
const { generalApiLimiter, authLimiter } = require("./config/rateLimiters");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();

// Trust reverse proxy (Task 3: Render runs behind a reverse proxy; without this all clients share the proxy IP)
app.set("trust proxy", 1);

// Security Headers (Task 4: Enable Helmet with default secure headers including CSP for JSON API)
app.use(helmet());

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
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Rate limiters (Task 3)
app.use("/api", generalApiLimiter);
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
  maxHttpBufferSize: 1e6, // 1MB payload limit (Task 1)
  pingTimeout: 20000,     // 20s ping timeout (Task 1)
  pingInterval: 25000,
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
// 404 & Central Error Handling Middleware (Task 5)
// ============================================
app.use("/api", notFound);
app.use(notFound);
app.use(errorHandler);

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
