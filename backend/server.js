const express  = require('express');
const dotenv   = require('dotenv');
const cors     = require('cors');
const http     = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');
const { protect } = require('./middleware/authMiddleware');










// Routes
const authRoutes = require('./routes/authRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

// Socket handler
const socketHandler = require('./sockets/socketHandler');

// ────────────────────────────────────────────────────────────
// 1. Load env + connect DB
dotenv.config();
connectDB();

// 2. Init express
const app = express();

// ── CORS: allow BOTH 5173 (Vite) and 3000 (CRA) ─────────────
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// 3. REST API routes
app.use('/api/auth', authRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);



// 4. Create HTTP server + Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// 5. Attach socket logic
socketHandler(io);

// 6. Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀  Server running on port ${PORT}`));
