import io from 'socket.io-client';

// ✅ FIXED: Proper Socket.IO initialization
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  'https://whispr-j7jw.onrender.com';

export const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ['websocket', 'polling'],
  withCredentials: true,
});

// Debug logs
socket.on('connect', () => {
  console.log('✅ Socket.IO Connected:', socket.id);
});

socket.on('disconnect', () => {
  console.log('❌ Socket.IO Disconnected');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket.IO Error:', error);
});

export default socket;
