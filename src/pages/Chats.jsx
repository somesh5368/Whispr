import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import socket from '../utils/socket';
import API from '../utils/api';

const getUser = () => {
  try {
    const data = localStorage.getItem('user');
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

function Chats({ onSelectContact, selectedContact, isMobile = false }) {
  const currentUser = useMemo(() => getUser(), []);
  const [recentContacts, setRecentContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  if (!currentUser || !currentUser.token) return null;

  const authHeaders = { Authorization: `Bearer ${currentUser.token}` };
  const currentUserName = currentUser?.user?.name || currentUser?.name || currentUser?.email || 'User';

  const fetchRecentContacts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await API.get('/api/messages/recent', { headers: authHeaders });
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
  }, [currentUser?.token]);

  useEffect(() => {
    fetchRecentContacts();
  }, [currentUser?.token]);

  useEffect(() => {
    const handleUpdate = () => fetchRecentContacts();
    socket.off('updateRecentContacts');
    socket.on('updateRecentContacts', handleUpdate);
    return () => socket.off('updateRecentContacts', handleUpdate);
  }, [currentUser?.token]);

  useEffect(() => {
    const handleUserOnline = (payload) => {
      const id = payload?.userId ?? payload;
      if (id) setOnlineUsers((prev) => new Set(prev).add(String(id)));
    };
    const handleUserOffline = (payload) => {
      const id = payload?.userId ?? payload;
      if (id) setOnlineUsers((prev) => { const s = new Set(prev); s.delete(String(id)); return s; });
    };
    socket.on('userOnline', handleUserOnline);
    socket.on('userOffline', handleUserOffline);
    return () => {
      socket.off('userOnline', handleUserOnline);
      socket.off('userOffline', handleUserOffline);
    };
  }, []);

  const handleOpenChat = useCallback(
    async (user) => {
      try {
        const id = user.id || user._id;
        if (id) await API.patch(`/api/messages/${id}/read`, {}, { headers: authHeaders });
        fetchRecentContacts();
      } catch (err) {
        console.error('mark-read failed:', err);
      }
      try {
        localStorage.setItem(
          'lastSelectedContact',
          JSON.stringify({ id: user.id || user._id, name: user.name, email: user.email, avatar: user.avatar })
        );
      } catch {}
      onSelectContact(user);
    },
    [authHeaders, onSelectContact, fetchRecentContacts]
  );

  const searchUsers = useCallback(
    async (q) => {
      try {
        setSearchLoading(true);
        const res = await API.get('/api/users/search', { params: { q }, headers: authHeaders });
        const list = res.data?.data ?? res.data;
        setSearchResults(Array.isArray(list) ? list : []);
        setShowSearchResults(true);
      } catch (err) {
        console.error('searchUsers failed:', err);
        setSearchResults([]);
        setShowSearchResults(true);
      } finally {
        setSearchLoading(false);
      }
    },
    [currentUser?.token]
  );

  const handleSearchChange = useCallback(
    (value) => {
      setSearchQuery(value);
      const trimmed = value.trim();
      if (!trimmed) {
        setShowSearchResults(false);
        setSearchResults([]);
        return;
      }
      const localFiltered = recentContacts.filter(
        (c) =>
          c.name?.toLowerCase().includes(trimmed.toLowerCase()) ||
          c.email?.toLowerCase().includes(trimmed.toLowerCase())
      );
      if (localFiltered.length > 0) {
        setSearchResults(localFiltered);
        setShowSearchResults(true);
      } else {
        searchUsers(trimmed);
      }
    },
    [recentContacts, searchUsers]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  }, []);

  const displayContacts =
    showSearchResults && searchQuery.trim().length > 0 ? searchResults : recentContacts;

  const renderSkeleton = () => (
    <div className="flex-1 overflow-y-auto p-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 rounded-xl animate-pulse">
          <div className="h-12 w-12 rounded-full bg-slate-200" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-slate-200 rounded" />
            <div className="h-3 w-24 bg-slate-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmpty = () => {
    const isSearch = !!searchQuery.trim();
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="text-4xl mb-3 opacity-70">💬</div>
        <p className="text-sm font-medium text-slate-600">
          {isSearch ? 'No users or chats found' : 'No recent chats'}
        </p>
        <p className="text-xs text-slate-500 mt-1">
          {isSearch ? 'Try a different search or start a new chat.' : 'Select a user or search above to start.'}
        </p>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white text-slate-800 shadow-card">
      {/* Sidebar header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white flex-shrink-0 shadow-md">
              {currentUserName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-semibold truncate text-slate-800">Chats</p>
              <p className="text-xs text-slate-500 truncate">{currentUserName}</p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-xs text-emerald-600 flex-shrink-0 font-medium">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Active</span>
          </span>
        </div>
      </div>

      {/* Search */}
      <div className="flex-shrink-0 px-3 py-2 bg-white">
        <div className="relative flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5 border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition">
          <FaSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search or start a chat"
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-h-0 py-0"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={clearSearch}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200"
              aria-label="Clear search"
            >
              <FaTimes size={14} />
            </button>
          )}
        </div>
        {searchLoading && (
          <p className="mt-1.5 text-xs text-slate-500 text-center">Searching…</p>
        )}
      </div>

      {/* List */}
      {loading ? (
        renderSkeleton()
      ) : displayContacts.length === 0 ? (
        renderEmpty()
      ) : (
        <div className="flex-1 overflow-y-auto min-h-0">
          {displayContacts.map((user) => {
            const id = (user.id || user._id || user.userId)?.toString();
            const isOnline = onlineUsers.has(id);
            const avatarUrl =
              user.avatar && user.avatar.trim()
                ? user.avatar
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'U')}&background=4a154b&color=fff`;
            const displayName = user.name || user.email || 'Unknown';
            const lastMessage = user.lastMessage || 'No messages yet';
            const unreadCount = user.unreadCount || 0;
            const isSelected = selectedContact?.id === id || selectedContact?._id === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => handleOpenChat(user)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mx-2 my-0.5 text-left transition ${
                  isSelected
                    ? 'bg-indigo-100 border-l-4 border-indigo-500 text-slate-800'
                    : 'hover:bg-slate-50 text-slate-800 border-l-4 border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-12 w-12 rounded-full object-cover border-2 border-slate-200"
                  />
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate text-slate-800">{displayName}</span>
                    {user.lastMessageAt && (
                      <span className="text-xs text-slate-500 flex-shrink-0">
                        {new Date(user.lastMessageAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 truncate line-clamp-1">
                      {lastMessage.length > 35 ? `${lastMessage.slice(0, 35)}…` : lastMessage}
                    </span>
                    {unreadCount > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-indigo-500 text-xs text-white font-semibold flex items-center justify-center flex-shrink-0 shadow-sm">
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
