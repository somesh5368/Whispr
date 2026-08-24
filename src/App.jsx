// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import NotFound from "./pages/NotFound";

import socket from "./utils/socket";

// Get user from localStorage
const getUser = () => {
  try {
    const data = localStorage.getItem("user");
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// Protected Route Component
const PrivateRoute = ({ children }) => {
  const user = getUser();
  return user?.token ? children : <Navigate to="/login" replace />;
};

function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSocketConnected, setIsSocketConnected] = useState(socket.connected);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const onConnect = () => setIsSocketConnected(true);
    const onDisconnect = () => setIsSocketConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onDisconnect);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onDisconnect);
    };
  }, []);

  return (
    <BrowserRouter>
      {/* Offline Banner */}
      {!isOnline ? (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-medium z-50">
          You're offline. Some features may not work until you're back online.
        </div>
      ) : (
        !isSocketConnected && (
          <div className="bg-indigo-600 text-white text-center py-1.5 text-xs font-medium z-50 animate-pulse">
            Reconnecting to Whispr server…
          </div>
        )
      )}

      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/main"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

        {/* Redirect root to /main or /login */}
        <Route
          path="/"
          element={
            <Navigate to={getUser()?.token ? "/main" : "/login"} replace />
          }
        />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
