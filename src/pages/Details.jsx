import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const time = new Date(message.createdAt || message.timestamp).toLocaleTimeString(
    'en-US',
    {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }
  );

  const statusIcon = (status) => {
    if (status === 'sent') {
      return (
        <IoCheckmark className="text-11px text-gray-500 inline-block ml-1" />
      );
    }
    if (status === 'delivered') {
      return (
        <IoCheckmarkDone className="text-11px text-gray-500 inline-block ml-1" />
      );
    }
    if (status === 'read') {
      return (
        <IoCheckmarkDoneSharp className="text-xs text-white/90 inline-block ml-1" />
      );
    }
    return null;
  };

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex gap-2 max-w-[85%] sm:max-w-xs ${isMe ? 'flex-row-reverse' : ''}`}>
        {!isMe && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full overflow-hidden bg-ws-surface-alt border border-ws-border flex items-center justify-center">
            {senderAvatar ? (
              <img src={senderAvatar} alt={senderName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-ws-text-muted">
                {senderName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
        )}

        <div
          className={`rounded-2xl px-4 py-2.5 shadow-md ${
            isMe
              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-card'
          }`}
        >
          {!isMe && (
            <p className="text-xs font-semibold mb-1 opacity-80">{senderName}</p>
          )}

          {message.image && (
            <div className="mb-2">
              <img
                src={message.image}
                alt="shared"
                className="rounded-lg max-h-64 max-w-full object-cover"
                onError={(e) => {
                  e.target.src =
                    'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="%23999"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
              {!isMe && (
                <button
                  onClick={() => onDownload(message.image)}
                  className="text-xs mt-1 block text-ws-primary hover:underline"
                >
                  Download
                </button>
              )}
            </div>
          )}

          {message.message && (
            <p className="break-words whitespace-pre-wrap text-sm leading-snug">
              {message.message}
            </p>
          )}

          <div
            className={`flex items-center justify-end gap-1 mt-1 text-xs ${
              isMe ? 'text-white/80' : 'text-ws-text-muted'
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

    socket.emit('join', { userId: currentUserId });

    return () => {
      socket.emit('leave', { userId: currentUserId });
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
    const trimmed = message.trim();
    if (!trimmed || !user || !currentUserId) return;

    const otherId = user.id || user._id;
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Optimistically append message so it appears instantly
    const localMsg = normalizeMessage({
      _id: tempId,
      senderId: currentUserId,
      receiverId: otherId,
      message: trimmed,
      status: 'sent',
      timestamp: Date.now(),
    });

    setMessages((prev) => [...prev, localMsg]);

    sendMessage({ message: trimmed });

    setMessage('');

    socket.emit('stopTyping', {
      to: otherId,
      from: currentUserId,
    });
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
    const emoji = typeof emojiData === 'string'
      ? emojiData
      : (emojiData?.emoji ?? emojiData?.character ?? '');
    if (emoji) {
      setMessage((prev) => prev + emoji);
    }
    setShowEmojiPicker(false);
    setTimeout(() => inputRef.current?.focus(), 50);
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
      const receiverId = typeof otherId === 'string' ? otherId : String(otherId);

      try {
        setUploadingImage(true);

        // Try to compress
        try {
          file = await compressImage(file, 1024, 0.75);
        } catch (err) {
          console.warn('Compression failed, sending original:', err);
        }

        // postForm sets multipart/form-data with boundary correctly (field name "image" = multer.single("image"))
        const res = await axios.postForm(
          `${API_BASE}/api/messages/upload-image`,
          { image: file, receiverId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const msgDoc = normalizeMessage(res.data.message || res.data);
        setMessages((prev) => [...prev, msgDoc]);

        // Also emit via socket to keep real-time in sync
        socket.emit('sendMessage', msgDoc);
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

  // Receive messages via socket (single source of truth for incoming)
  useEffect(() => {
    if (!currentUserId) return;

    const recv = (data) => {
      const normalized = normalizeMessage(data);

      // For messages we just sent, we already appended optimistically
      if (normalized.senderId?.toString() === currentUserId?.toString()) {
        return;
      }

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
    (user.avatar && user.avatar.trim()) || (user.img && user.img.trim())
      ? (user.avatar || user.img)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user.name || 'U'
        )}&background=6366f1&color=fff`;

  const statusText = isTyping
    ? 'typing...'
    : isOnline
    ? 'Online'
    : 'Last seen recently';

  return (
    <div className="h-full flex flex-col bg-slate-50/50 relative">
      {/* Chat header */}
      <div className="px-4 py-3 bg-white border-b border-slate-200 flex-shrink-0 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {isMobile && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 -ml-1 rounded-lg hover:bg-ws-surface-alt text-ws-text transition flex-shrink-0"
                aria-label="Back to chats"
              >
                <FaArrowLeft className="text-lg" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenProfile}
              className="flex items-center gap-3 focus:outline-none rounded-lg hover:bg-ws-surface-alt transition flex-1 min-w-0 py-1"
            >
              <img
                src={avatarUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full object-cover border-2 border-ws-border flex-shrink-0"
              />
              <div className="flex flex-col leading-tight min-w-0 text-left">
                <span className="text-sm font-semibold text-ws-text truncate">
                  {user.name || user.username || 'Whispr User'}
                </span>
                <span className="text-xs text-ws-text-muted flex items-center gap-1.5">
                  {isOnline && <span className="h-2 w-2 rounded-full bg-ws-online" />}
                  {statusText}
                </span>
              </div>
            </button>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setShowSearch(true)}
              className="p-2.5 rounded-lg text-ws-text-muted hover:text-ws-text hover:bg-ws-surface-alt transition"
              title="Search messages"
            >
              🔍
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-2.5 rounded-lg text-ws-text-muted hover:text-red-600 hover:bg-red-50 transition"
              title="Clear chat"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>

      {/* ==================== */}
      {/* MESSAGES AREA */}
      {/* ==================== */}

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-gradient-to-b from-slate-50 to-white">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <p className="text-sm text-ws-text-muted">
              No messages yet. Say hello! 👋
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe =
              msg.senderId?.toString() === currentUserId?.toString();
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

        {isTyping && (
          <div className="flex gap-2 items-center">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-ws-surface border border-ws-border flex items-center justify-center">
              <span className="text-xs font-semibold text-ws-text-muted">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex gap-1 items-center bg-ws-surface border border-ws-border px-3 py-2 rounded-2xl rounded-bl-md">
              <span className="h-2 w-2 rounded-full bg-ws-text-muted animate-bounce" style={{ animationDelay: '0s' }} />
              <span className="h-2 w-2 rounded-full bg-ws-text-muted animate-bounce" style={{ animationDelay: '0.2s' }} />
              <span className="h-2 w-2 rounded-full bg-ws-text-muted animate-bounce" style={{ animationDelay: '0.4s' }} />
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 bg-white border-t border-slate-200 flex-shrink-0 relative shadow-[0_-4px_12px_rgba(0,0,0,0.04)]">
        {showEmojiPicker && createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:justify-end p-4 pb-24 sm:pb-4 sm:pr-4"
            onClick={() => setShowEmojiPicker(false)}
            role="presentation"
          >
            <div
              className="rounded-2xl shadow-2xl border-2 border-ws-border bg-white overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Pick an emoji"
            >
              <EmojiPicker
                onEmojiClick={(emojiData) => handleEmojiClick(emojiData)}
                width={320}
                height={400}
                searchDisabled={false}
                skinTonesDisabled
                previewConfig={{ showPreview: false }}
                theme="light"
              />
            </div>
          </div>,
          document.body
        )}

        <div className="relative flex items-center gap-2">
          <button
            type="button"
            onClick={toggleEmojiPicker}
            className="p-2.5 rounded-lg text-ws-text-muted hover:text-ws-text hover:bg-ws-surface-alt transition flex-shrink-0"
            title="Emoji"
          >
            <BsEmojiSmile className="text-lg" />
          </button>
          <button
            type="button"
            onClick={handleImageClick}
            className="p-2.5 rounded-lg text-ws-text-muted hover:text-ws-text hover:bg-ws-surface-alt transition flex-shrink-0 disabled:opacity-50"
            disabled={uploadingImage}
            title="Upload image"
          >
            <HiOutlinePhotograph className="text-lg" />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={uploadingImage ? 'Uploading…' : 'Type a message'}
              disabled={uploadingImage}
              className="w-full px-4 py-2.5 text-sm border border-ws-border rounded-xl bg-ws-surface-alt focus:outline-none focus:ring-2 focus:ring-ws-primary/20 focus:border-ws-primary disabled:bg-ws-surface-alt"
            />
          </div>
          <button
            onClick={handleSend}
            disabled={!message.trim() || uploadingImage}
            className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 transition flex-shrink-0 shadow-lg shadow-indigo-500/30"
            title="Send"
          >
            <IoIosSend className="text-lg" />
          </button>
        </div>
      </div>

      {/* ==================== */}
      {/* SEARCH OVERLAY */}
      {/* ==================== */}

      {showSearch && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-30 p-4">
          <div className="bg-ws-surface rounded-2xl shadow-xl w-full max-w-md border border-ws-border">
            <div className="flex items-center px-4 py-3 border-b border-ws-border">
              <span className="text-sm font-semibold text-ws-text flex-1">Search in chat</span>
              <button
                onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                className="p-2 rounded-lg text-ws-text-muted hover:text-ws-text hover:bg-ws-surface-alt"
              >
                <FaTimes size={18} />
              </button>
            </div>
            <div className="px-4 py-3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search in this chat"
                className="w-full px-4 py-2.5 text-sm border border-ws-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ws-primary/20 bg-ws-surface-alt"
                autoFocus
              />
            </div>
            <div className="max-h-80 overflow-y-auto px-4 pb-3 space-y-2 text-xs">
              {!searchQuery.trim() ? (
                <p className="text-ws-text-muted text-center py-6">Type to search messages</p>
              ) : filteredMessages.length === 0 ? (
                <p className="text-ws-text-muted text-center py-6">No messages found</p>
              ) : (
                filteredMessages.map((msg, index) => {
                  if (!msg.message) return null;
                  const time = new Date(msg.createdAt || msg.timestamp).toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: true,
                  });
                  const isMe = msg.senderId?.toString() === currentUserId?.toString();
                  const msgKey = msg.id || `tmp-${index}`;
                  return (
                    <div
                      key={msgKey}
                      className="p-3 rounded-lg border border-ws-border hover:bg-ws-surface-alt cursor-pointer transition"
                      onClick={() => {
                        setShowSearch(false);
                        setSearchQuery('');
                        setTimeout(() => {
                          const el = messageRefs.current[msgKey];
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }, 200);
                      }}
                    >
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-ws-text">{isMe ? 'You' : user.name || 'User'}</span>
                        <span className="text-ws-text-muted">{time}</span>
                      </div>
                      <p className="text-ws-text-muted text-sm line-clamp-2">{msg.message}</p>
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-40 p-4">
          <div className="bg-ws-surface rounded-2xl shadow-xl w-full max-w-sm p-5 border border-ws-border">
            <h3 className="text-base font-semibold text-ws-text mb-2">Clear chat?</h3>
            <p className="text-sm text-ws-text-muted mb-5">
              Messages will be removed from this device only. The other person will still see them.
            </p>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2.5 rounded-lg border border-ws-border hover:bg-ws-surface-alt text-ws-text text-sm font-medium transition"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-600 text-sm font-medium transition"
                onClick={() => { setMessages([]); setShowClearConfirm(false); }}
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
