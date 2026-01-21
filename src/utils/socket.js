import io from 'socket.io-client';

// Get backend URL from environment or use default
const BACKEND_URL = 
  import.meta.env.VITE_API_URL || 
  'https://whispr-j7jw.onrender.com';

console.log('🔌 Connecting to:', BACKEND_URL);

// Create socket instance
const socket = io(BACKEND_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

// Debug events
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});

socket.on('connect_error', (err) => {
  console.error('❌ Socket error:', err);
});

export default socket;
