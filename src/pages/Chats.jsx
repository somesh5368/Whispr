import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import socket from '../utils/socket';
import API from '../utils/api';

// Read user safely from localStorage
const getUser = () => {
  try {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

function Chats({ onSelectContact, selectedContact, isMobile = false }) {
  // State management
  const currentUser = useMemo(() => getUser(), []);
  const [recentContacts, setRecentContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // No user token - do not render
  if (!currentUser || !currentUser.token) {
    return null;
  }

  const authHeaders = {
    Authorization: `Bearer ${currentUser.token}`,
  };

  const currentUserName = currentUser?.user?.name || currentUser?.name || currentUser?.email || 'User';
  const currentUserAvatar = currentUser?.user?.avatar || currentUser?.avatar || '';

  // ==================
  // FETCH & LOAD DATA
  // ==================

  // Fetch recent contacts from API
  const fetchRecentContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/messages/recent-contacts', { headers: authHeaders });
      const contacts = Array.isArray(res.data?.contacts)
        ? res.data.contacts
        : Array.isArray(res.data)
        ? res.data
        : [];
      setRecentContacts(contacts);
    } catch (err) {
      console.error('Failed to load recent contacts:', err);
      setRecentContacts([]);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  // Load recent contacts on mount
  useEffect(() => {
    fetchRecentContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.token]);

  // Listen for socket event to refresh contacts
  useEffect(() => {
    const handleUpdate = () => {
      fetchRecentContacts();
    };

    socket.off('updateRecentContacts');
    socket.on('updateRecentContacts', handleUpdate);

    return () => {
      socket.off('updateRecentContacts', handleUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser.token]);

  // ==================
  // ONLINE/OFFLINE
  // ==================

  // Track online/offline users
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

  // ==================
  // OPEN & MARK READ
  // ==================

  // Open chat and mark messages as read
  const handleOpenChat = useCallback(
    async (user) => {
      try {
        const id = user.id || user._id;
        if (id) {
          await API.post(`/api/messages/mark-read/${id}`, {}, { headers: authHeaders });
        }
        fetchRecentContacts();
      } catch (err) {
        console.error('mark-read failed:', err);
      }

      // Save last opened contact
      try {
        localStorage.setItem(
          'lastSelectedContact',
          JSON.stringify({
            id: user.id || user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          })
        );
      } catch {
        // ignore localStorage errors
      }

      // Call handler in parent
      onSelectContact(user);
    },
    [authHeaders, onSelectContact, fetchRecentContacts]
  );

  // ==================
  // SEARCH USERS
  // ==================

  // Call backend to search users
  const searchUsers = useCallback(
    async (q) => {
      try {
        setSearchLoading(true);
        const res = await API.get('/api/users/search', {
          params: { q },
          headers: authHeaders,
        });
        const users = Array.isArray(res.data) ? res.data : [];
        setSearchResults(users);
        setShowSearchResults(true);
      } catch (err) {
        console.error('searchUsers failed:', err);
        setSearchResults([]);
        setShowSearchResults(true);
      } finally {
        setSearchLoading(false);
      }
    },
    [authHeaders]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (value) => {
      const query = value;
      setSearchQuery(query);

      const trimmed = query.trim();

      if (!trimmed) {
        setShowSearchResults(false);
        setSearchResults([]);
        return;
      }

      // Filter in recent contacts first
      const localFiltered = recentContacts.filter(
        (contact) =>
          contact.name?.toLowerCase().includes(trimmed.toLowerCase()) ||
          contact.email?.toLowerCase().includes(trimmed.toLowerCase())
      );

      if (localFiltered.length > 0) {
        setSearchResults(localFiltered);
        setShowSearchResults(true);
      } else {
        // Fall back to global user search
        searchUsers(trimmed);
      }
    },
    [recentContacts, searchUsers]
  );

  // Clear search box
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  // ==================
  // RENDER LOGIC
  // ==================

  // Decide which list to show
  const displayContacts = showSearchResults && searchQuery.trim().length > 0 ? searchResults : recentContacts;

  // Skeleton loader for better UX
  const renderSkeleton = () => (
    <div className="flex-1 overflow-y-auto bg-white">
      {Array.from({ length: 6 }).map((_, idx) => (
        <div key={idx} className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 animate-pulse">
          <div className="h-11 w-11 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-gray-200 rounded" />
            <div className="h-3 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  // Empty state for no chats or search results
  const renderEmptyState = () => {
    const isSearch = !!searchQuery.trim();
    return (
      <div className="flex flex-col items-center justify-center py-12 text-xs text-gray-500 px-4 text-center">
        <div className="text-4xl mb-4">💬</div>
        <p className="font-medium">
          {isSearch ? 'No users or chats found' : 'No recent chats'}
        </p>
        <p className="mt-1 text-gray-400">
          {isSearch
            ? 'Try searching a different name or email. Start a new conversation using the search above.'
            : 'Start a conversation by selecting a user or searching above.'}
        </p>
      </div>
    );
  };

  // ==================
  // RENDER COMPONENT
  // ==================

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md">
        <div className="flex items-center justify-between">
          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col leading-tight hidden sm:flex">
              <span className="text-sm font-bold">Chats</span>
              <span className="text-10px text-blue-100">{currentUserName}</span>
            </div>
          </div>

          {/* Status */}
          <div className="text-10px text-blue-100 flex items-center gap-1">
            <span className="hidden sm:inline">Connected</span>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Search Box */}
      <div className="px-3 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
          <svg
            className="w-4 h-4 text-gray-500 flex-shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
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
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search users or chats..."
            className="flex-1 bg-transparent text-sm placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-gray-400 hover:text-gray-600 text-xs flex-shrink-0"
              aria-label="Clear search"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>

        {searchLoading && (
          <p className="mt-1 text-10px text-gray-400 text-center">Searching...</p>
        )}
      </div>

      {/* List Content */}
      {loading ? (
        renderSkeleton()
      ) : displayContacts.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="flex-1 overflow-y-auto bg-white">
          {displayContacts.map((user) => {
            const id = (user.id || user._id || user.userId)?.toString();
            const isOnline = onlineUsers.has(id);
            const avatarUrl = user.avatar && user.avatar.trim()
              ? user.avatar
              : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=0D8ABC&color=fff`;

            const displayName = user.name || user.email || 'Unknown';
            const lastMessage = user.lastMessage || 'Say hello';
            const unreadCount = user.unreadCount || 0;
            const isSelected = selectedContact?.id === id || selectedContact?._id === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleOpenChat(user)}
                className={`w-full flex items-center gap-3 px-3 py-3 transition-all duration-200 border-b border-gray-100 last:border-b-0 focus:outline-none ${
                  isSelected
                    ? 'bg-blue-50 border-l-4 border-l-blue-600'
                    : 'hover:bg-gray-50'
                }`}
              >
                {/* Avatar and online dot */}
                <div className="relative flex-shrink-0">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
                  )}
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-13px font-semibold text-gray-900 truncate">
                      {displayName}
                    </span>
                    {user.lastMessageAt && (
                      <span className="text-10px text-gray-400 ml-2 flex-shrink-0">
                        {new Date(user.lastMessageAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>

                  {/* Message Preview */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-11px text-gray-600 truncate">
                      {lastMessage.length > 40 ? `${lastMessage.substring(0, 40)}...` : lastMessage}
                    </span>

                    {/* Unread Badge */}
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
      )}
    </div>
  );
}

export default Chats;
