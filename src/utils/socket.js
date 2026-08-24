// src/utils/socket.js
import io from "socket.io-client";

// Prefer explicit socket URL, fallback to API URL, then localhost
const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000";

if (import.meta.env.DEV) {
  console.log("🔌 Connecting socket to:", SOCKET_URL);
}

const getToken = () => {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.token || data?.user?.token || null;
  } catch {
    return null;
  }
};

const socket = io(SOCKET_URL, {
  auth: (cb) => {
    cb({ token: getToken() });
  },
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  transports: ["websocket", "polling"],
  withCredentials: true,
});

if (import.meta.env.DEV) {
  socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
  socket.on("disconnect", () => console.log("❌ Socket disconnected"));
  socket.on("connect_error", (err) => console.error("❌ Socket connect error:", err?.message || err));
}

export default socket;
