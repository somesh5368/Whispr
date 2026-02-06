import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  IoCheckmark,
  IoCheckmarkDone,
  IoCheckmarkDoneSharp,
} from 'react-icons/io5';
import { IoIosSend } from 'react-icons/io';
import { BsEmojiSmile } from 'react-icons/bs';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { FaTimes, FaArrowLeft } from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import axios from 'axios';
import socket from '../utils/socket';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ==================
// UTILITY FUNCTIONS
// ==================

// Optional client-side image compression
const compressImage = (file, maxWidth = 1024, quality = 0.75) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const scale = Math.min(maxWidth / img.width, 1);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error('Compression failed'));
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target.result;
    };

    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });

// Normalize message from backend/socket to have senderId, receiverId
const normalizeMessage = (msg) => ({
  ...msg,
  senderId: msg.senderId || msg.sender?._id || msg.sender?.id,
  receiverId: msg.receiverId || msg.receiver?._id || msg.receiver?.id,
  id: msg._id || msg.id,
  createdAt: msg.createdAt || msg.timestamp,
});

// ==================
// MESSAGE BUBBLE COMPONENT (Extracted)
// ==================

const MessageBubble = ({
  message,
  isMe,
  currentUserId,
  onDownload,
  senderName,
  senderAvatar,
}) => {
  const time = new Date(message.createdAt || message.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const statusIcon = (status) => {
    if (status === 'sent') {
      return <IoCheckmark className="text-11px text-gray-500 inline-block ml-1" />;
    }
    if (status === 'delivered') {
      return <IoCheckmarkDone className="text-11px text-gray-500 inline-block ml-1" />;
    }
    if (status === 'read') {
      return <IoCheckmarkDoneSharp className="text-11px text-blue-500 inline-block ml-1" />;
    }
    return null;
  };

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 max-w-xs ${isMe ? 'flex-row-reverse' : ''}`}>
        {/* Avatar - only show for received messages */}
        {!isMe && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {senderAvatar ? (
              <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-gray-600">
                {senderName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`rounded-2xl px-4 py-2 ${
            isMe
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-900 rounded-bl-none'
          }`}
        >
          {/* Sender name - only show for received messages */}
          {!isMe && (
            <p className="text-xs font-semibold mb-1 opacity-75">
              {senderName}
            </p>
          )}

          {/* Image if present */}
          {message.image && (
            <div className="mb-2">
              <img
                src={message.image}
                alt="shared"
                className="rounded-lg max-h-64 max-w-xs object-cover"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
              {!isMe && (
                <button
                  onClick={() => onDownload(message.image)}
                  className={`text-xs mt-1 block ${
                    isMe ? 'text-blue-200 hover:text-white' : 'text-gray-600 hover:text-gray-800 underline'
                  }`}
                >
                  Download
                </button>
              )}
            </div>
          )}

          {/* Text message */}
          {message.message && (
            <p className="break-words whitespace-pre-wrap text-sm leading-snug">
              {message.message}
            </p>
          )}

          {/* Time and status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-xs ${
              isMe ? 'text-blue-200' : 'text-gray-500'
            }`}
          >
            <span>{time}</span>
            {isMe && statusIcon(message.status)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================
// MAIN DETAILS COMPONENT
// ==================

function Details({
  user,
  onOpenProfile,
  onBack,
  isMobile = false,
}) {
  // ==================
  // STATE
  // ==================

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Refs
  const scrollRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const messageRefs = useRef({});

  // User data
  const storedUser = (() => {
    try {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const currentUser = storedUser?.user || storedUser;
  const currentUserId = currentUser?.id || currentUser?._id;
  const token = storedUser?.token;

  // ==================
  // SOCKET & DATA LOADING
  // ==================

  // Join/leave socket room for current user
  useEffect(() => {
    if (!currentUserId) return;

    socket.emit('join', currentUserId);

    return () => {
      socket.emit('leave', currentUserId);
    };
  }, [currentUserId]);

  // Fetch messages with selected user
  useEffect(() => {
    if (!user || (!user?.id && !user?._id)) return;
    if (!currentUserId || !token) return;

    const otherId = user.id || user._id;
    if (!otherId) return;

    const fetchMessages = async () => {
      try {
        const { data } = await axios.get(
          `${API_BASE}/api/messages/${otherId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const serverMessages = data.messages || [];
        setMessages(serverMessages.map(normalizeMessage));
      } catch (err) {
        console.error('Failed to fetch messages:', err);
        setMessages([]);
      }
    };

    fetchMessages();
  }, [user, currentUserId, token]);

  // ==================
  // MESSAGE SENDING
  // ==================

  // Send message via socket
  const sendMessage = useCallback(
    (payload) => {
      if (!user) return;

      const otherId = user.id || user._id;
      if (!otherId || !currentUserId) return;

      const base = {
        senderId: currentUserId,
        receiverId: otherId,
        sender: { _id: currentUserId },
        receiver: { _id: otherId },
        timestamp: Date.now(),
        ...payload,
      };

      socket.emit('sendMessage', base);
    },
    [user, currentUserId]
  );

  const handleSend = useCallback(() => {
    if (!message.trim()) return;

    sendMessage({
      message: message.trim(),
    });

    setMessage('');

    if (user && currentUserId) {
      const otherId = user.id || user._id;
      socket.emit('stopTyping', {
        to: otherId,
        from: currentUserId,
      });
    }
  }, [message, sendMessage, user, currentUserId]);

  const handleChange = useCallback(
    (e) => {
      const value = e.target.value;
      setMessage(value);

      if (!user || !currentUserId) return;

      const otherId = user.id || user._id;
      if (!otherId) return;

      socket.emit('typing', {
        to: otherId,
        from: currentUserId,
        isTyping: true,
      });

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', {
          to: otherId,
          from: currentUserId,
        });
      }, 800);
    },
    [user, currentUserId]
  );

  // ==================
  // EMOJI & FILE HANDLING
  // ==================

  const handleEmojiClick = useCallback((emojiData) => {
    setMessage((prev) => prev + (emojiData?.emoji || ''));
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, []);

  const toggleEmojiPicker = useCallback(() => {
    setShowEmojiPicker((prev) => !prev);
  }, []);

  const handleDownloadImage = useCallback(async (url) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `whispr-image-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Image download failed:', err);
      alert('Failed to download image');
    }
  }, []);

  const handleImageClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(
    async (e) => {
      let file = e.target.files?.[0];
      if (!file || !user || !currentUserId || !token) return;

      const otherId = user.id || user._id;
      if (!otherId) return;

      try {
        setUploadingImage(true);

        // Try to compress
        try {
          file = await compressImage(file, 1024, 0.75);
        } catch (err) {
          console.warn('Compression failed, sending original:', err);
        }

        const formData = new FormData();
        formData.append('image', file);
        formData.append('receiverId', otherId);

        const res = await axios.post(
          `${API_BASE}/api/messages/upload-image`,
          formData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const msgDoc = normalizeMessage(res.data.message || res.data);
        setMessages((prev) => [...prev, msgDoc]);
      } catch (err) {
        console.error('Image upload failed:', err.response?.data || err.message);
        alert(err.response?.data?.message || 'Image upload failed');
      } finally {
        setUploadingImage(false);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [user, currentUserId, token]
  );

  // ==================
  // RECEIVE MESSAGES
  // ==================

  // Receive messages via socket (single source of truth)
  useEffect(() => {
    if (!currentUserId) return;

    const recv = (data) => {
      const normalized = normalizeMessage(data);

      setMessages((prev) => {
        // If same id exists, update it
        if (normalized.id) {
          const exists = prev.some((m) => m.id === normalized.id);
          if (exists) {
            return prev.map((m) =>
              m.id === normalized.id ? { ...m, ...normalized } : m
            );
          }
        }

        // Otherwise append as new
        return [...prev, normalized];
      });

      // Only receiver sends delivery/read receipts
      if (normalized.receiverId?.toString() === currentUserId?.toString()) {
        socket.emit('messageDelivered', {
          messageId: normalized.id,
          senderId: normalized.senderId,
        });

        setTimeout(() => {
          socket.emit('messageRead', {
            messageId: normalized.id,
                        senderId: normalized.senderId,
          });
        }, 500);
      }
    };

    socket.on('receiveMessage', recv);

    return () => {
      socket.off('receiveMessage', recv);
    };
  }, [currentUserId]);

  // Delivered/read updates
  useEffect(() => {
    const delivered = (messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'delivered' } : msg
        )
      );
    };

    const read = (messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, status: 'read' } : msg
        )
      );
    };

    socket.on('messageDelivered', delivered);
    socket.on('messageRead', read);

    return () => {
      socket.off('messageDelivered', delivered);
      socket.off('messageRead', read);
    };
  }, []);

  // ==================
  // TYPING INDICATOR
  // ==================

  // Typing indicator - only other user
  useEffect(() => {
    if (!user || !currentUserId) return;

    const otherId = user.id || user._id;
    if (!otherId) return;

    const handleUserTyping = ({ from, isTyping: typing }) => {
      if (from?.toString() === otherId?.toString()) {
        setIsTyping(!!typing);
      }
    };

    const handleStopTyping = ({ from }) => {
      if (from?.toString() === otherId?.toString()) {
        setIsTyping(false);
      }
    };

    socket.on('userTyping', handleUserTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('userTyping', handleUserTyping);
      socket.off('stopTyping', handleStopTyping);
    };
  }, [user, currentUserId]);

  // ==================
  // ONLINE/OFFLINE STATUS
  // ==================

  useEffect(() => {
    if (!user) return;

    const otherId = user.id || user._id;
    if (!otherId) return;

    const handleOnline = (userId) => {
      if (userId?.toString() === otherId?.toString()) {
        setIsOnline(true);
      }
    };

    const handleOffline = (userId) => {
      if (userId?.toString() === otherId?.toString()) {
        setIsOnline(false);
      }
    };

    socket.on('userOnline', handleOnline);
    socket.on('userOffline', handleOffline);

    return () => {
      socket.off('userOnline', handleOnline);
      socket.off('userOffline', handleOffline);
    };
  }, [user]);

  // ==================
  // SCROLL TO BOTTOM
  // ==================

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ==================
  // KEYBOARD & SEARCH
  // ==================

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const filteredMessages = searchQuery.trim()
    ? messages.filter((m) =>
        m.message?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  // ==================
  // RENDER
  // ==================

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50 p-4">
        <p className="text-sm text-gray-500 text-center">
          Select a chat to start messaging.
        </p>
      </div>
    );
  }

  const avatarUrl =
    user.img && user.img.trim()
      ? user.img
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name || 'U'
        )}&background=0D8ABC&color=fff`;

  const statusText = isTyping
    ? 'typing...'
    : isOnline
    ? 'Online'
    : 'Last seen recently';

  return (
    <div className="h-full flex flex-col bg-gray-50 relative">
      {/* ==================== */}
      {/* HEADER */}
      {/* ==================== */}

      <div className="px-3 py-2.5 bg-teal-600 text-white shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* Left: Back button + User info */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isMobile && (
              <button
                type="button"
                onClick={onBack}
                className="text-xl mr-1 hover:opacity-80 transition-opacity flex-shrink-0"
                aria-label="Back to chats"
              >
                <FaArrowLeft />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-3 focus:outline-none hover:opacity-90 transition-opacity flex-1 min-w-0"
            >
              <img
                src={avatarUrl}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-white flex-shrink-0"
              />
              <div className="flex flex-col leading-tight min-w-0">
                <span className="text-14px font-semibold max-w-160px sm:max-w-220px truncate text-white">
                  {user.name || user.username || 'Whispr User'}
                </span>
                <span className="text-11px text-emerald-100">
                  {statusText}
                </span>
              </div>
            </button>
          </div>

          {/* Right: Action buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowSearch(true)}
              className="text-11px px-2.5 py-1.5 rounded-full bg-teal-700 hover:bg-teal-800 transition-colors flex-shrink-0"
              title="Search messages"
            >
              🔍
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="text-11px px-2.5 py-1.5 rounded-full bg-red-500 hover:bg-red-600 transition-colors flex-shrink-0"
              title="Clear chat"
            >
              🗑️
            </button>
            {isOnline && (
              <span className="h-2 w-2 rounded-full bg-emerald-300 flex-shrink-0" />
            )}
          </div>
        </div>
      </div>

      {/* ==================== */}
      {/* MESSAGES AREA */}
      {/* ==================== */}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-3 bg-gray-50">
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-400">
              No messages yet. Start the conversation! 👋
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe = msg.senderId?.toString() === currentUserId?.toString();
            const msgKey = msg.id || `tmp-${index}`;
            const senderName = isMe ? 'You' : user.name || 'User';
            const senderAvatar = isMe ? '' : avatarUrl;

            return (
              <div
                key={msgKey}
                ref={(el) => {
                  if (el) messageRefs.current[msgKey] = el;
                  if (index === filteredMessages.length - 1)
                    scrollRef.current = el;
                }}
              >
                <MessageBubble
                  message={msg}
                  isMe={isMe}
                  currentUserId={currentUserId}
                  onDownload={handleDownloadImage}
                  senderName={senderName}
                  senderAvatar={senderAvatar}
                />
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex gap-2 items-center">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex gap-1 items-center bg-gray-300 px-3 py-2 rounded-2xl rounded-bl-none">
              <span className="h-2 w-2 rounded-full bg-gray-500 animate-bounce" />
              <span
                className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <span
                className="h-2 w-2 rounded-full bg-gray-500 animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* ==================== */}
      {/* INPUT AREA */}
      {/* ==================== */}

      <div className="px-3 py-3 bg-white border-t border-gray-200 flex-shrink-0">
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-24 left-0 z-20 p-2">
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

        {/* Input controls */}
        <div className="relative flex items-center gap-2">
          {/* Emoji button */}
          <button
            type="button"
            onClick={toggleEmojiPicker}
            className="p-2 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex-shrink-0"
            title="Emoji picker"
          >
            <BsEmojiSmile className="text-lg" />
          </button>

          {/* Image button */}
          <button
            type="button"
            onClick={handleImageClick}
            className="p-2 rounded-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={uploadingImage}
            title="Upload image"
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

          {/* Message input */}
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={
                uploadingImage ? 'Uploading image...' : 'Type a message'
              }
              disabled={uploadingImage}
              className="w-full px-4 py-2.5 text-13px border border-gray-300 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent disabled:bg-gray-100"
            />
            {isTyping && (
              <span className="ml-3 text-10px text-gray-500 absolute right-3 top-1/2 -translate-y-1/2">
                typing...
              </span>
            )}
          </div>

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!message.trim() || uploadingImage}
            className="p-2.5 rounded-full bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed transition shadow-sm flex-shrink-0"
            title="Send message"
          >
            <IoIosSend className="text-lg" />
          </button>
        </div>
      </div>

      {/* ==================== */}
      {/* SEARCH OVERLAY */}
      {/* ==================== */}

      {showSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-30 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
            {/* Header */}
            <div className="flex items-center px-4 py-3 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-900 flex-1">
                Search messages
              </span>
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 flex-shrink-0"
              >
                <FaTimes size={18} />
              </button>
            </div>

            {/* Search input */}
            <div className="px-4 py-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in this chat"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent bg-gray-50"
                autoFocus
              />
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto px-4 pb-3 space-y-2 text-xs">
              {!searchQuery.trim() ? (
                <p className="text-gray-400 text-center py-4">
                  Type to search messages
                </p>
              ) : filteredMessages.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  No messages found
                </p>
              ) : (
                filteredMessages.map((msg, index) => {
                  if (!msg.message) return null;

                  const time = new Date(
                    msg.createdAt || msg.timestamp
                  ).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  });
                  const isMe =
                    msg.senderId?.toString() === currentUserId?.toString();
                  const msgKey = msg.id || `tmp-${index}`;

                  return (
                    <div
                      key={msgKey}
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        setTimeout(() => {
                          const el = messageRefs.current[msgKey];
                          if (el) {
                            el.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center',
                            });
                          }
                        }, 200);
                      }}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-gray-800">
                          {isMe ? 'You' : user.name || 'User'}
                        </span>
                        <span className="text-10px text-gray-400">
                          {time}
                        </span>
                      </div>
                      <p className="text-gray-700 text-11px line-clamp-2">
                        {msg.message}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==================== */}
      {/* CLEAR CHAT CONFIRM */}
      {/* ==================== */}

      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              Clear chat?
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              This will remove all messages from this device. It will not delete
              them for the other person.
            </p>

            <div className="flex justify-end gap-2 text-xs">
              <button
                className="px-4 py-2 rounded-full border border-gray-300 hover:bg-gray-50 transition"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
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
    </div>
  );
}

export default Details;

