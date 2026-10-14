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
import {
  FaTimes,
  FaArrowLeft,
  FaBan,
} from 'react-icons/fa';
import EmojiPicker from 'emoji-picker-react';
import API from '../utils/api';
import socket from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import MessageActions from '../component/MessageActions';
import MessageEditor from '../component/MessageEditor';
import ConfirmModal from '../component/ConfirmModal';

// Named constant matching backend
const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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
  isDeleted: Boolean(msg.isDeleted),
  isEdited: Boolean(msg.isEdited),
  editedAt: msg.editedAt || null,
});

// ==================
// MESSAGE BUBBLE COMPONENT (Extracted)
// ==================

const MessageBubble = ({
  message,
  isMe,
  onDownload,
  onDelete,
  onStartEdit,
  isEditing,
  onSaveEdit,
  onCancelEdit,
  isSavingEdit,
  editError,
  isMenuOpen,
  onToggleMenu,
  onCloseMenu,
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
    if (status === 'failed') {
      return (
        <span className="text-xs text-red-200 font-medium inline-block ml-1 cursor-pointer" title="Failed to send. Tap to retry.">
          ⚠️ Failed
        </span>
      );
    }
    if (status === 'sent') {
      return (
        <IoCheckmark className="text-11px text-gray-200 inline-block ml-1" />
      );
    }
    if (status === 'delivered') {
      return (
        <IoCheckmarkDone className="text-11px text-gray-200 inline-block ml-1" />
      );
    }
    if (status === 'read') {
      return (
        <IoCheckmarkDoneSharp className="text-xs text-white/90 inline-block ml-1" />
      );
    }
    return null;
  };

  // WhatsApp-style deleted message: muted, italic bubble with ban icon and no actions menu
  if (message.isDeleted) {
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
            className={`rounded-2xl px-4 py-2.5 border shadow-sm ${
              isMe
                ? 'bg-indigo-50/70 border-indigo-200/60 text-slate-500 rounded-br-md'
                : 'bg-slate-100/90 border-slate-200 text-slate-500 rounded-bl-md'
            }`}
          >
            {!isMe && (
              <p className="text-xs font-semibold mb-1 opacity-70">{senderName}</p>
            )}

            <div className="flex items-center gap-1.5 py-0.5 text-sm italic select-none text-slate-500">
              <FaBan className="text-slate-400 text-xs flex-shrink-0" />
              <span>{isMe ? 'You deleted this message' : 'This message was deleted'}</span>
            </div>

            <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-slate-400">
              <span>{time}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const messageCreatedAt = new Date(message.createdAt || message.timestamp).getTime();
  const isWithinEditWindow = Date.now() - messageCreatedAt < EDIT_WINDOW_MS;
  const canEdit =
    isMe &&
    !message.isDeleted &&
    Boolean(message.message && message.message !== '[Image]' && message.message.trim()) &&
    isWithinEditWindow;

  return (
    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className={`relative group flex gap-2 max-w-[85%] sm:max-w-xs ${isMe ? 'flex-row-reverse' : ''}`}>
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

        {isEditing ? (
          <div
            className={`rounded-2xl px-4 py-3 shadow-md w-full min-w-[220px] sm:min-w-[280px] ${
              isMe
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-card'
            }`}
          >
            <MessageEditor
              initialText={message.message}
              onSave={(newText) => onSaveEdit(message, newText)}
              onCancel={onCancelEdit}
              isSaving={isSavingEdit}
              error={editError}
            />
          </div>
        ) : (
          <div
            className={`relative rounded-2xl px-4 py-2.5 shadow-md ${
              isMe
                ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md'
                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-card'
            }`}
          >
            {!isMe && (
              <p className="text-xs font-semibold mb-1 opacity-80">{senderName}</p>
            )}

            {/* Menu trigger for user's own non-deleted messages */}
            {isMe && (
              <div className="absolute top-1.5 right-1.5 z-10">
                <MessageActions
                  message={message}
                  canEdit={canEdit}
                  isOpen={isMenuOpen}
                  onToggle={() => onToggleMenu(message.id || message._id)}
                  onClose={onCloseMenu}
                  onStartEdit={onStartEdit}
                  onDelete={onDelete}
                />
              </div>
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
              <p className={`break-words whitespace-pre-wrap text-sm leading-snug ${isMe ? 'pr-5' : ''}`}>
                {message.message}
              </p>
            )}

            <div
              className={`flex items-center justify-end gap-1 mt-1 text-xs ${
                isMe ? 'text-white/80' : 'text-ws-text-muted'
              }`}
            >
              {message.isEdited && (
                <span className="text-[10px] opacity-75 italic mr-0.5">edited</span>
              )}
              <span>{time}</span>
              {isMe && statusIcon(message.status)}
            </div>
          </div>
        )}
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

  const { user: authUser, token } = useAuth();
  const currentUserId = authUser?.id || authUser?._id;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMenuMessageId, setActiveMenuMessageId] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState(null);

  // Refs
  const messagesContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const isInitialLoadRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const messageRefs = useRef({});

  // ==================
  // SOCKET & DATA LOADING
  // ==================

  // Join socket room for current user
  useEffect(() => {
    if (!currentUserId) return;

    socket.emit('join', { userId: currentUserId });
    // Note: Keep socket in room so user continues receiving events even across screen changes
  }, [currentUserId]);

  // Fetch initial messages with selected user
  useEffect(() => {
    if (!user || (!user?.id && !user?._id)) return;
    if (!currentUserId || !token) return;

    const otherId = user.id || user._id;
    if (!otherId) return;

    let isMounted = true;
    isInitialLoadRef.current = true;
    setHasMore(true);
    setLoadingOlder(false);
    setInitialLoading(true);

    const fetchMessages = async () => {
      try {
        const { data } = await API.get(`/api/messages/${otherId}?limit=30`);
        if (!isMounted) return;
        const serverMessages = (data.messages || []).map(normalizeMessage);
        setMessages(serverMessages);
        setHasMore(data.hasMore !== undefined ? data.hasMore : serverMessages.length === 30);
      } catch (err) {
        if (!isMounted) return;
        console.error('Failed to fetch messages:', err);
        setMessages([]);
        setHasMore(false);
      } finally {
        if (isMounted) setInitialLoading(false);
      }
    };

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [user, currentUserId, token]);

  // Scroll to bottom when initial messages load
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        isInitialLoadRef.current = false;
      }
    }
  }, [messages]);

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
      id: tempId,
      clientId: tempId,
      senderId: currentUserId,
      receiverId: otherId,
      message: trimmed,
      status: 'sent',
      timestamp: Date.now(),
    });

    setMessages((prev) => [...prev, localMsg]);
    requestAnimationFrame(() => {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    });

    // 8-second ack timer: mark message failed if server doesn't respond
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((m) =>
          (m.id === tempId || m._id === tempId || m.clientId === tempId) && m.status === 'sent'
            ? { ...m, status: 'failed' }
            : m
        )
      );
    }, 8000);

    sendMessage({ message: trimmed, clientId: tempId });

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

        const res = await API.postForm('/api/messages/upload-image', {
          image: file,
          receiverId,
        });

        const msgDoc = normalizeMessage(res.data.message || res.data);
        setMessages((prev) => [...prev, msgDoc]);
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        });
      } catch (err) {
        console.error('Image upload failed:', err.response?.data || err.message);
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

      if (isNearBottomRef.current) {
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
          }
        });
      }

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

  // Delivered/read/sent ack updates
  useEffect(() => {
    const sentAck = ({ clientId, messageId, status }) => {
      console.log('// DEBUG-REMOVE [Details] messageSent ack received:', { clientId, messageId, status });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === clientId || msg.clientId === clientId
            ? { ...msg, id: messageId || msg.id, _id: messageId || msg._id, status: status || 'sent' }
            : msg
        )
      );
    };

    const delivered = (messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(messageId) || String(msg._id) === String(messageId)
            ? { ...msg, status: 'delivered' }
            : msg
        )
      );
    };

    const read = (messageId) => {
      setMessages((prev) =>
        prev.map((msg) =>
          String(msg.id) === String(messageId) || String(msg._id) === String(messageId)
            ? { ...msg, status: 'read' }
            : msg
        )
      );
    };

    const handleMessageDeleted = ({ messageId }) => {
      console.log('// DEBUG-REMOVE [Details] client received messageDeleted:', { messageId });
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id || m._id) === String(messageId)
            ? { ...m, isDeleted: true, message: '', image: null }
            : m
        )
      );
    };

    const handleMessageEdited = ({ messageId, message: newText, isEdited, editedAt }) => {
      console.log('// DEBUG-REMOVE [Details] client received messageEdited:', { messageId, newText });
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id || m._id) === String(messageId)
            ? {
                ...m,
                message: newText,
                isEdited: isEdited !== undefined ? isEdited : true,
                editedAt: editedAt || new Date().toISOString(),
              }
            : m
        )
      );
    };

    socket.on('messageSent', sentAck);
    socket.on('messageDelivered', delivered);
    socket.on('messageRead', read);
    socket.on('messageDeleted', handleMessageDeleted);
    socket.on('messageEdited', handleMessageEdited);

    return () => {
      socket.off('messageSent', sentAck);
      socket.off('messageDelivered', delivered);
      socket.off('messageRead', read);
      socket.off('messageDeleted', handleMessageDeleted);
      socket.off('messageEdited', handleMessageEdited);
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

    const handleOnline = (payload) => {
      const id = payload?.userId ?? payload;
      if (id?.toString() === otherId?.toString()) {
        setIsOnline(true);
      }
    };

    const handleOffline = (payload) => {
      const id = payload?.userId ?? payload;
      if (id?.toString() === otherId?.toString()) {
        setIsOnline(false);
      }
    };

    const handleOnlineUsers = (users) => {
      if (Array.isArray(users) && otherId) {
        setIsOnline(users.map(String).includes(otherId.toString()));
      }
    };

    if (typeof user?.isOnline === 'boolean') {
      setIsOnline(user.isOnline);
    }

    socket.on('onlineUsers', handleOnlineUsers);
    socket.on('userOnline', handleOnline);
    socket.on('userOffline', handleOffline);

    socket.emit('getOnlineUsers');

    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
      socket.off('userOnline', handleOnline);
      socket.off('userOffline', handleOffline);
    };
  }, [user]);

  // Fetch older messages on scroll near top
  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasMore || messages.length === 0) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const otherId = user?.id || user?._id;
    if (!otherId) return;

    const oldestMsg = messages[0];
    const cursor = oldestMsg?.createdAt || oldestMsg?.timestamp;
    if (!cursor) return;

    setLoadingOlder(true);
    const prevScrollHeight = container.scrollHeight;
    const prevScrollTop = container.scrollTop;

    try {
      const { data } = await API.get(
        `/api/messages/${otherId}?limit=30&before=${encodeURIComponent(new Date(cursor).toISOString())}`
      );
      const olderMessages = (data.messages || []).map(normalizeMessage);

      if (olderMessages.length < 30 || data.hasMore === false) {
        setHasMore(false);
      }

      if (olderMessages.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id || m._id));
          const filteredOlder = olderMessages.filter((m) => !existingIds.has(m.id || m._id));
          return [...filteredOlder, ...prev];
        });

        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - prevScrollHeight + prevScrollTop;
          }
        });
      }
    } catch (err) {
      console.error('Failed to load older messages:', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [loadingOlder, hasMore, messages, user]);

  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 100;

    if (container.scrollTop < 60 && hasMore && !loadingOlder && messages.length > 0) {
      loadOlderMessages();
    }
  }, [hasMore, loadingOlder, messages.length, loadOlderMessages]);

  const handleDeleteClick = useCallback((msg) => {
    setMessageToDelete(msg);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!messageToDelete) return;
    const targetId = messageToDelete.id || messageToDelete._id;
    const previousMessages = [...messages];

    // Optimistic UI update: mark message as deleted
    setMessages((prev) =>
      prev.map((m) =>
        String(m.id || m._id) === String(targetId)
          ? { ...m, isDeleted: true, message: '', image: null }
          : m
      )
    );
    setMessageToDelete(null);
    setIsDeleting(true);

    try {
      await API.delete(`/api/messages/${targetId}`);
    } catch (err) {
      console.error('Failed to delete message:', err);
      // Rollback on failure
      setMessages(previousMessages);
      alert(err.response?.data?.message || 'Failed to delete message. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [messageToDelete, messages]);

  const handleStartEdit = useCallback((msg) => {
    setEditingMessageId(msg.id || msg._id);
    setEditError(null);
    setActiveMenuMessageId(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingMessageId(null);
    setEditError(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (msg, newText) => {
      const targetId = msg.id || msg._id;
      const trimmed = (newText || '').trim();

      if (!trimmed) {
        setEditError('Message text cannot be empty');
        return;
      }

      if (trimmed === msg.message) {
        setEditingMessageId(null);
        setEditError(null);
        return;
      }

      setIsSavingEdit(true);
      setEditError(null);
      const previousMessages = [...messages];

      // Optimistic UI update: update text and mark as edited
      setMessages((prev) =>
        prev.map((m) =>
          String(m.id || m._id) === String(targetId)
            ? {
                ...m,
                message: trimmed,
                isEdited: true,
                editedAt: new Date().toISOString(),
              }
            : m
        )
      );

      try {
        await API.patch(`/api/messages/${targetId}/edit`, { message: trimmed });
        setEditingMessageId(null);
        setEditError(null);
      } catch (err) {
        console.error('Failed to edit message:', err);
        // Rollback on failure
        setMessages(previousMessages);
        setEditError(err.response?.data?.message || 'Failed to edit message. Please try again.');
      } finally {
        setIsSavingEdit(false);
      }
    },
    [messages]
  );

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
          </div>
        </div>
      </div>

      {/* ==================== */}
      {/* MESSAGES AREA */}
      {/* ==================== */}

      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        onClick={() => setActiveMenuMessageId(null)}
        className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 bg-gradient-to-b from-slate-50 to-white"
      >
        {loadingOlder && (
          <div className="flex items-center justify-center py-2 text-xs text-slate-500">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
            Loading older messages…
          </div>
        )}
        {!loadingOlder && !hasMore && messages.length >= 30 && (
          <div className="text-center py-2 text-xs text-slate-400">
            Beginning of conversation
          </div>
        )}
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[200px]">
            <p className="text-sm text-ws-text-muted">
              {initialLoading ? 'Loading messages…' : 'No messages yet. Say hello! 👋'}
            </p>
          </div>
        ) : (
          filteredMessages.map((msg, index) => {
            const isMe =
              msg.senderId?.toString() === currentUserId?.toString();
            const msgKey = msg.id || msg._id || `tmp-${index}`;
            const senderName = isMe ? 'You' : user.name || 'User';
            const senderAvatar = isMe ? '' : avatarUrl;
            const isEditing = Boolean(
              editingMessageId &&
                (String(editingMessageId) === String(msgKey) ||
                  String(editingMessageId) === String(msg.id) ||
                  String(editingMessageId) === String(msg._id))
            );
            const isMenuOpen = Boolean(
              activeMenuMessageId &&
                (String(activeMenuMessageId) === String(msgKey) ||
                  String(activeMenuMessageId) === String(msg.id) ||
                  String(activeMenuMessageId) === String(msg._id))
            );

            return (
              <div
                key={msgKey}
                ref={(el) => {
                  if (el) messageRefs.current[msgKey] = el;
                }}
              >
                <MessageBubble
                  message={msg}
                  isMe={isMe}
                  onDownload={handleDownloadImage}
                  onDelete={handleDeleteClick}
                  onStartEdit={handleStartEdit}
                  isEditing={isEditing}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancelEdit}
                  isSavingEdit={isSavingEdit}
                  editError={isEditing ? editError : null}
                  isMenuOpen={isMenuOpen}
                  onToggleMenu={(id) =>
                    setActiveMenuMessageId((prev) => (String(prev) === String(id) ? null : id))
                  }
                  onCloseMenu={() => setActiveMenuMessageId(null)}
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
      {/* DELETE MESSAGE CONFIRM MODAL */}
      {/* ==================== */}
      <ConfirmModal
        isOpen={Boolean(messageToDelete)}
        title="Delete this message?"
        message="This message will be removed for everyone in this chat. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isProcessing={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setMessageToDelete(null);
        }}
      />
    </div>
  );
}

export default Details;
