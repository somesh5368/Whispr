// src/pages/Chats.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import Search from "../component/Search";
import socket from "../utils/socket";

function Chats({ onSelectContact }) {
  const currentUser = (() => {
    try {
      const data = localStorage.getItem("user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const [recentContacts, setRecentContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const fetchRecentContacts = async () => {
    if (!currentUser?.token) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/messages/recent/contacts`,
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );
      setRecentContacts(res.data || []);
    } catch (err) {
      console.error("Failed to load recent contacts", err);
      setRecentContacts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRecentContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.token]);

  useEffect(() => {
    const handleUpdate = () => {
      fetchRecentContacts();
    };
    socket.on("updateRecentContacts", handleUpdate);
    return () => socket.off("updateRecentContacts", handleUpdate);
  }, []);

  useEffect(() => {
    const handleUserOnline = (userId) => {
      setOnlineUsers((prev) => {
        const copy = new Set(prev);
        copy.add(userId.toString());
        return copy;
      });
    };
    const handleUserOffline = (userId) => {
      setOnlineUsers((prev) => {
        const copy = new Set(prev);
        copy.delete(userId.toString());
        return copy;
      });
    };
    socket.on("userOnline", handleUserOnline);
    socket.on("userOffline", handleUserOffline);
    return () => {
      socket.off("userOnline", handleUserOnline);
      socket.off("userOffline", handleUserOffline);
    };
  }, []);

  if (!currentUser) return null;

  const currentUserName =
    currentUser?.user?.name ||
    currentUser?.name ||
    currentUser?.email ||
    "";

  const handleOpenChat = async (user) => {
    const id = user._id.toString();

    onSelectContact(user);

    try {
      await axios.post(
        `${API_BASE_URL}/api/messages/mark-read/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );
      fetchRecentContacts();
    } catch (err) {
      console.error("mark-read failed", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Chats header – blue */}
      <div className="px-4 py-3 bg-[#2563eb] text-white shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-semibold">
              C
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold">Chats</span>
              <span className="text-[11px] text-blue-100">
                {currentUserName}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="hidden sm:inline text-blue-100">Connected</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2 border-b border-gray-200 bg-white">
        <Search />
      </div>

      {/* Chats list */}
      <div className="flex-1 overflow-y-auto bg-white">
        {loading && (
          <div className="flex items-center justify-center py-6 text-xs text-gray-500">
            Loading chats...
          </div>
        )}

        {!loading && recentContacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-xs text-gray-500 px-4 text-center">
            <p>No recent chats.</p>
            <p className="mt-1 hidden sm:block">
              Start one from search.
            </p>
          </div>
        )}

        {!loading &&
          recentContacts.map((user) => {
            const id = user._id.toString();
            const isOnline = onlineUsers.has(id);
            const avatarUrl =
              user.img && user.img.trim()
                ? user.img
                : "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";
            const displayName =
              user.name || user.email || "Unknown user";
            const lastMessage = user.lastMessage || "";
            const unread = user.unreadCount || 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleOpenChat(user)}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 flex flex-col items-start">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[13px] font-medium text-[#0f172a] truncate max-w-[140px]">
                      {displayName}
                    </span>
                    {user.lastMessageAt && (
                      <span className="text-[10px] text-gray-400 ml-2">
                        {new Date(user.lastMessageAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="w-full flex items-center justify-between mt-0.5">
                    <span className="text-[11px] text-gray-500 truncate max-w-[130px] sm:max-w-[180px]">
                      {lastMessage ? (
                        lastMessage
                      ) : (
                        <span className="hidden sm:inline">
                          No messages yet
                        </span>
                      )}
                    </span>
                    {unread > 0 && (
                      <span className="ml-2 min-w-[18px] h-[18px] rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center px-1">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
}

export default Chats;
