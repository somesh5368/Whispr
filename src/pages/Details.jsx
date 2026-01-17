// src/pages/Details.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  IoCheckmark,
  IoCheckmarkDone,
  IoCheckmarkDoneSharp,
} from "react-icons/io5";
import { IoIosSend } from "react-icons/io";
import { BsEmojiSmile } from "react-icons/bs";
import { HiOutlinePhotograph } from "react-icons/hi";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";
import socket from "../utils/socket";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const compressImage = (file, maxWidth = 1024, quality = 0.75) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compression failed"));
            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

function Details({ user, onOpenProfile, onBack, layout = "desktop" }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const messageRefs = useRef({});

  const storedUser = (() => {
    try {
      const data = localStorage.getItem("user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const currentUser = storedUser?.user || storedUser || null;
  const currentUserId = currentUser?._id || currentUser?.id;
  const isMobileLayout = layout === "mobile";

  useEffect(() => {
    if (!currentUserId) return;
    socket.emit("join", currentUserId);
    return () => {
      socket.emit("leave", currentUserId);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!user || (!user?._id && !user?.id)) return;
    if (!currentUserId) return;
    const otherId = user._id || user.id;

    const fetchMessages = async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE}/api/messages/${currentUserId}/${otherId}`,
          {
            headers: {
              Authorization: `Bearer ${storedUser?.token}`,
            },
          }
        );
        setMessages(data);
      } catch (err) {
        console.error("Failed to fetch messages", err);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [user, currentUserId, storedUser?.token]);

  const sendMessage = (payload = {}) => {
    if (!user) return;
    const otherId = user._id || user.id;
    if (!otherId || !currentUserId) return;

    const clientId = `cid-${Date.now()}-${Math.random()
      .toString(16)
      .slice(2)}`;

    const base = {
      senderId: currentUserId,
      receiverId: otherId,
      timestamp: Date.now(),
      clientId,
      ...payload,
    };

    socket.emit("sendMessage", base);

    setMessages((prev) => [
      ...prev,
      { ...base, status: "sent", _id: `tmp-${clientId}` },
    ]);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage({ message: message.trim() });
    setMessage("");

    if (user) {
      const otherId = user._id || user.id;
      socket.emit("stopTyping", { to: otherId, from: currentUserId });
    }
  };

  const handleChange = (e) => {
    const value = e.target.value;
    setMessage(value);

    if (!user || !currentUserId) return;
    const otherId = user._id || user.id;
    if (!otherId) return;

    socket.emit("typing", { to: otherId, from: currentUserId });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { to: otherId, from: currentUserId });
    }, 800);
  };

  const handleDownloadImage = async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `whispr-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Image download failed", err);
      alert("Failed to download image");
    }
  };

  useEffect(() => {
    const recv = (data) => {
      setMessages((prev) => {
        if (data._id && prev.some((m) => m._id === data._id)) return prev;

        if (data.clientId) {
          const idx = prev.findIndex(
            (m) =>
              m.clientId === data.clientId &&
              m.senderId?.toString() === data.senderId?.toString() &&
              m.receiverId?.toString() === data.receiverId?.toString()
          );
          if (idx !== -1) {
            const copy = [...prev];
            copy[idx] = { ...data };
            return copy;
          }
        }

        return [...prev, data];
      });

      if (data.receiverId?.toString() === currentUserId?.toString()) {
        socket.emit("messageDelivered", {
          messageId: data._id,
          senderId: data.senderId,
        });
        setTimeout(() => {
          socket.emit("messageRead", {
            messageId: data._id,
            senderId: data.senderId,
          });
        }, 500);
      }
    };

    socket.on("receiveMessage", recv);
    return () => socket.off("receiveMessage", recv);
  }, [currentUserId]);

  useEffect(() => {
    const delivered = (messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId || msg.id === messageId
            ? { ...msg, status: "delivered" }
            : msg
        )
      );
    };
    const read = (messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId || msg.id === messageId
            ? { ...msg, status: "read" }
            : msg
        )
      );
    };

    socket.on("messageDelivered", delivered);
    socket.on("messageRead", read);
    return () => {
      socket.off("messageDelivered", delivered);
      socket.off("messageRead", read);
    };
  }, []);

  useEffect(() => {
    if (!user || !currentUserId) return;
    const otherId = user._id || user.id;
    if (!otherId) return;

    const handleTyping = ({ from }) => {
      if (from?.toString() === otherId?.toString()) setIsTyping(true);
    };
    const handleStopTyping = ({ from }) => {
      if (from?.toString() === otherId?.toString()) setIsTyping(false);
    };

    socket.on("typing", handleTyping);
    socket.on("stopTyping", handleStopTyping);
    return () => {
      socket.off("typing", handleTyping);
      socket.off("stopTyping", handleStopTyping);
    };
  }, [user, currentUserId]);

  useEffect(() => {
    if (!user) return;
    const otherId = user._id || user.id;
    if (!otherId) return;

    const handleOnline = (userId) => {
      if (userId?.toString() === otherId?.toString()) setIsOnline(true);
    };
    const handleOffline = (userId) => {
      if (userId?.toString() === otherId?.toString()) setIsOnline(false);
    };

    socket.on("userOnline", handleOnline);
    socket.on("userOffline", handleOffline);
    return () => {
      socket.off("userOnline", handleOnline);
      socket.off("userOffline", handleOffline);
    };
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const tick = (status) => {
    if (status === "sent")
      return (
        <IoCheckmark className="text-[11px] text-gray-500 inline-block ml-1" />
      );
    if (status === "delivered")
      return (
        <IoCheckmarkDone className="text-[11px] text-gray-500 inline-block ml-1" />
      );
    if (status === "read")
      return (
        <IoCheckmarkDoneSharp className="text-[11px] text-[#53bdeb] inline-block ml-1" />
      );
    return null;
  };

  if (!user)
    return (
      <div className="h-full flex items-center justify-center bg-[#F9FAFB]">
        <p className="text-sm text-gray-500 px-4 text-center">
          Select a chat to start messaging.
        </p>
      </div>
    );

  const avatarUrl =
    user.img && user.img.trim()
      ? user.img
      : "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

  const statusText = isTyping
    ? "typing..."
    : isOnline
    ? "online"
    : "last seen recently";

  const handleEmojiClick = (emojiData) => {
    setMessage((prev) => (prev || "") + (emojiData?.emoji || ""));
    setShowEmojiPicker(false);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const toggleEmojiPicker = () => {
    setShowEmojiPicker((prev) => !prev);
  };

  const handleImageClick = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    let file = e.target.files?.[0];
    if (!file || !user || !currentUserId) return;
    const otherId = user._id || user.id;
    if (!otherId) return;

    try {
      setUploadingImage(true);

      try {
        file = await compressImage(file, 1024, 0.75);
      } catch (err) {
        console.warn("Compression failed, sending original", err);
      }

      const clientId = `cid-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;

      const formData = new FormData();
      formData.append("image", file);
      formData.append("senderId", currentUserId);
      formData.append("receiverId", otherId);
      formData.append("clientId", clientId);

      const res = await axios.post(
        `${API_BASE}/api/messages/upload-image`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${storedUser?.token}`,
          },
        }
      );

      const data = res.data;

      if (data && (data._id || data.id)) {
        setMessages((prev) => [...prev, { ...data, status: "sent" }]);
        socket.emit("sendMessage", data);
      } else if (data && data.url) {
        sendMessage({ image: data.url });
      }

      setMessage("");
    } catch (err) {
      console.error("Image upload failed", err.response?.data || err.message);
      alert(err.response?.data?.message || "Image upload failed");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        (m.message || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  return (
    <>
      <div className="h-full flex flex-col bg-[#F9FAFB] relative">
        {/* HEADER */}
        <div className="px-3 py-2.5 bg-[#059669] text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isMobileLayout && (
                <button
                  type="button"
                  onClick={onBack}
                  className="text-xl mr-1"
                  aria-label="Back to chats"
                >
                  ←
                </button>
              )}
              <button
                type="button"
                onClick={onOpenProfile}
                className="flex items-center gap-3 focus:outline-none"
              >
                <img
                  src={avatarUrl}
                  alt={user.name || "User"}
                  className="w-9 h-9 rounded-full object-cover border border-white/40"
                />
                <div className="flex flex-col leading-tight">
                  <span className="text-[14px] font-semibold max-w-[160px] sm:max-w-[220px] truncate">
                    {user.name || user.username || "Whispr user"}
                  </span>
                  <span className="text-[11px] text-emerald-100">
                    {statusText}
                  </span>
                </div>
              </button>
            </div>

           <div className="flex items-center gap-2">
  {/* mobile + desktop dono par visible */}
  <button
    onClick={() => setShowSearch(true)}
    className="text-[11px] px-2.5 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-800"
  >
    Search
  </button>
  <button
    type="button"
    onClick={() => setShowClearConfirm(true)}
    className="text-[11px] px-2.5 py-1.5 rounded-full bg-red-500 hover:bg-red-600"
  >
    Clear
  </button>

  <span className="h-2 w-2 rounded-full bg-emerald-300" />
</div>

          </div>
        </div>

        {/* MESSAGES */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {messages.map((msg, index) => {
            const isMe =
              msg.senderId?.toString() === currentUserId?.toString();
            const time = new Date(
              msg.timestamp || msg.createdAt
            ).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });
            const msgKey = msg._id || msg.id || `tmp-${index}`;

            return (
              <div
                key={msgKey}
                ref={(el) => {
                  if (el) {
                    messageRefs.current[msgKey] = el;
                  }
                  if (index === messages.length - 1) {
                    scrollRef.current = el;
                  }
                }}
                className={`flex w-full ${
                  isMe ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[78%] rounded-lg px-3 py-2 text-[13px] shadow-sm ${
                    isMe
                      ? "bg-[#DCFCE7] text-[#064E3B]"
                      : "bg-white text-[#111827]"
                  }`}
                >
                  {msg.image && (
                    <div className="mb-1.5">
                      <img
                        src={msg.image}
                        alt="attachment"
                        className="rounded-lg max-h-72 object-cover shadow-sm"
                      />
                      {!isMe && (
                        <button
                          onClick={() => handleDownloadImage(msg.image)}
                          className="mt-1 text-[10px] text-emerald-700 underline hover:text-emerald-900"
                        >
                          Download
                        </button>
                      )}
                    </div>
                  )}
                  {msg.message && (
                    <p className="break-words whitespace-pre-line leading-snug">
                      {msg.message}
                    </p>
                  )}
                  <div className="flex items-center justify-end mt-1 text-[10px] text-gray-500">
                    <span>{time}</span>
                    {isMe && tick(msg.status)}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* INPUT */}
        <div className="px-3 py-2.5 bg-[#F3F4F6] border-t border-gray-200">
          <div className="relative flex items-center gap-2">
            {showEmojiPicker && (
              <div className="absolute bottom-12 left-0 z-20">
                <div className="rounded-xl shadow-lg border border-gray-200 bg-white overflow-hidden">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={window.innerWidth < 640 ? 220 : 280}
                    height={window.innerWidth < 640 ? 260 : 320}
                    searchDisabled
                    skinTonesDisabled
                    previewConfig={{ showPreview: false }}
                    theme="light"
                  />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={toggleEmojiPicker}
              className="p-2 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition"
            >
              <BsEmojiSmile className="text-lg" />
            </button>

            <button
              type="button"
              onClick={handleImageClick}
              className="p-2 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition disabled:opacity-50"
              disabled={uploadingImage}
            >
              <HiOutlinePhotograph className="text-lg" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />

            <div className="flex-1">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder={
                  uploadingImage ? "Uploading image..." : "Type a message"
                }
                disabled={uploadingImage}
                className="w-full px-4 py-2.5 text-[13px] border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent disabled:bg-gray-100"
              />
              {isTyping && (
                <span className="ml-3 text-[10px] text-gray-500">
                  typing...
                </span>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={!message.trim() || uploadingImage}
              className="p-2.5 rounded-full bg-[#059669] text-white hover:bg-[#047857] disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm"
            >
              <IoIosSend className="text-lg" />
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH OVERLAY */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 border border-gray-200">
            <div className="flex items-center px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900 flex-1">
                Search messages
              </span>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery("");
                }}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in this chat"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent bg-gray-50"
              />
            </div>

            <div className="max-h-80 overflow-y-auto px-4 pb-3 space-y-2 text-xs">
              {searchQuery.trim() === "" && (
                <p className="text-gray-400 text-center py-4">
                  Type to search messages
                </p>
              )}

              {searchQuery.trim() !== "" &&
                filteredMessages.map((msg, index) => {
                  if (!msg.message) return null;
                  const time = new Date(
                    msg.timestamp || msg.createdAt
                  ).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                  const isMe =
                    msg.senderId?.toString() === currentUserId?.toString();
                  const msgKey = msg._id || msg.id || `tmp-${index}`;

                  return (
                    <div
                      key={msgKey}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery("");
                        setTimeout(() => {
                          const el = messageRefs.current[msgKey];
                          if (el) {
                            el.scrollIntoView({
                              behavior: "smooth",
                              block: "center",
                            });
                          }
                        }, 200);
                      }}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-800">
                          {isMe ? "You" : user.name || "User"}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {time}
                        </span>
                      </div>
                      <p className="text-gray-700 text-[11px] line-clamp-2">
                        {msg.message}
                      </p>
                    </div>
                  );
                })}

              {searchQuery.trim() !== "" &&
                filteredMessages.filter((m) => m.message).length === 0 && (
                  <p className="text-gray-400 text-center py-4">
                    No messages found
                  </p>
                )}
            </div>
          </div>
        </div>
      )}

      {/* CLEAR CHAT CONFIRM */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-white rounded-2xl shadow-xl w-72 p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Clear chat?
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              This will remove messages from this device. It will not delete
              them for the other person.
            </p>
            <div className="flex justify-end gap-2 text-xs">
              <button
                className="px-3 py-1 rounded-full border border-gray-300 hover:bg-gray-50"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                onClick={() => {
                  setMessages([]);
                  setShowClearConfirm(false);
                }}
              >
                Clear chat
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Details;
