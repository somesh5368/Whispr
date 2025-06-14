const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Load env variables
dotenv.config();

// Connect to DB
connectDB();

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);

// Create HTTP server and bind Socket.io
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // your frontend URL
    methods: ['GET', 'POST']
  }
});

// Socket.io logic
io.on('connection', (socket) => {
  console.log('🔌 New client connected:', socket.id);

  // Join user to their own room using their user ID
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their personal room`);
  });

  // Message handling
  socket.on('send_message', ({ senderId, receiverId, message }) => {
    console.log(`Message from ${senderId} to ${receiverId}:`, message);

    // Emit message to the receiver's room
    io.to(receiverId).emit('receive_message', {
      senderId,
      message,
      timestamp: new Date()
    });
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
