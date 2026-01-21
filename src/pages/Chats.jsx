import React, { useEffect, useState } from 'react';
import Search from '../component/Search';
import  socket  from '../utils/socket';
import { API } from '../utils/api';

// Helper to safely get user from localStorage
const getUser = () => {
  try {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

function Chats({ onSelectContact }) {
  const currentUser = getUser();
  const [recentContacts, setRecentContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);

  // ============================================
  // FETCH RECENT CONTACTS
  // ============================================
  const fetchRecentContacts = async () => {
    if (!currentUser?.token) return;

    setLoading(true);
    try {
      const res = await API.get('/api/messages/recent-contacts', {
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      // Safety check
      setRecentContacts(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('❌ Failed to load recent contacts:', err);
      setRecentContacts([]);
    } finally {
      setLoading(false);
    }
  };

  // Load chats on mount
  useEffect(() => {
    fetchRecentContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.token]);

  // ============================================
  // SOCKET: UPDATE RECENT CONTACTS
  // ============================================
  useEffect(() => {
    if (!currentUser?.token) return;

    const handleUpdate = () => {
      fetchRecentContacts();
    };

    socket.off('updateRecentContacts');
    socket.on('updateRecentContacts', handleUpdate);

    return () => {
      socket.off('updateRecentContacts', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.token]);

  // ============================================
  // SOCKET: ONLINE/OFFLINE STATUS
  // ============================================
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

    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);

    return () => {
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
    };
  }, []);

  // ============================================
  // OPEN CHAT & MARK AS READ
  // ============================================
  const handleOpenChat = async (user) => {
    const id = user._id.toString();

    try {
      // Mark messages as read
      await API.post(
        `/api/messages/mark-read/${id}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${currentUser.token}`,
          },
        }
      );

      fetchRecentContacts();
    } catch (err) {
      console.error('❌ mark-read failed:', err);
    }

    // Call parent callback
    onSelectContact(user);
  };

  // ============================================
  // HANDLE SEARCH (Fixed - now visible!)
  // ============================================
  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.trim().length > 0) {
      const filtered = recentContacts.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(query.toLowerCase()) ||
          contact.email?.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered);
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  if (!currentUser) {
    return null;
  }

  const currentUserName =
    currentUser?.user?.name || currentUser?.name || currentUser?.email || 'User';
  const displayContacts = showSearch ? searchResults : recentContacts;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ===== HEADER ===== */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-xs font-semibold">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-bold">Chats</span>
              <span className="text-10px text-blue-100">{currentUserName}</span>
            </div>
          </div>
          <span className="text-10px text-blue-100 flex items-center gap-1">
            <span className="hidden sm:inline">Connected</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </span>
        </div>
      </div>

      {/* ===== SEARCH BAR (✅ NOW VISIBLE!) ===== */}
      <div className="px-3 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <svg
            className="w-4 h-4 text-gray-500 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearch(false);
                setSearchResults([]);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ===== CHAT LIST ===== */}
      <div className="flex-1 overflow-y-auto bg-white">
        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-8 text-xs text-gray-500">
            <div className="animate-spin">⟳</div> Loading chats...
          </div>
        )}

        {/* Empty State */}
        {!loading && displayContacts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-500 px-4 text-center">
            <div className="text-3xl mb-2">💬</div>
            <p className="font-medium">
              {showSearch ? 'No chats found' : 'No recent chats'}
            </p>
            <p className="mt-1 text-gray-400">
              {showSearch ? 'Try a different search' : 'Start one from search'}
            </p>
          </div>
        )}

        {/* Chat List */}
        {!loading &&
          Array.isArray(displayContacts) &&
          displayContacts.map((user) => {
            const id = user._id?.toString() || user.id?.toString();
            const isOnline = onlineUsers.has(id);
            const avatarUrl =
              user.avatar && user.avatar.trim()
                ? user.avatar
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user.name || 'User'
                  )}&background=0D8ABC&color=fff`;
            const displayName = user.name || user.email || 'Unknown';
            const lastMessage = user.lastMessage || 'No messages yet';
            const unreadCount = user.unreadCount || 0;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleOpenChat(user)}
                className="w-full flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 focus:outline-none focus:bg-blue-50"
              >
                {/* Avatar with Online Indicator */}
                <div className="relative flex-shrink-0">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-11 w-11 rounded-full object-cover"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
                  )}
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0 text-left">
                  {/* Name & Time */}
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-13px font-semibold text-gray-900 truncate">
                      {displayName}
                    </span>
                    <span className="text-10px text-gray-400 ml-2 flex-shrink-0">
                      {user.lastMessageAt
                        ? new Date(user.lastMessageAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : ''}
                    </span>
                  </div>

                  {/* Last Message & Unread Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-11px text-gray-600 truncate flex-1">
                      {lastMessage.length > 40
                        ? `${lastMessage.substring(0, 40)}...`
                        : lastMessage}
                    </span>
                    {unreadCount > 0 && (
                      <span className="ml-2 min-w-20px h-20px rounded-full bg-red-500 text-9px text-white font-semibold flex items-center justify-center flex-shrink-0 px-1.5">
                        {unreadCount > 99 ? '99+' : unreadCount}
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
