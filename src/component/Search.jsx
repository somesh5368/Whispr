import React, { useState, useEffect } from 'react';
import { API } from '../utils/api';
import socket from '../utils/socket';

const Search = ({ currentUser, onSelectContact }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const onOnline = (payload) => {
      const id = payload?.userId ?? payload;
      if (id) setOnlineUsers((prev) => new Set(prev).add(String(id)));
    };
    const onOffline = (payload) => {
      const id = payload?.userId ?? payload;
      if (id) setOnlineUsers((prev) => { const s = new Set(prev); s.delete(String(id)); return s; });
    };
    socket.on('userOnline', onOnline);
    socket.on('userOffline', onOffline);
    return () => {
      socket.off('userOnline', onOnline);
      socket.off('userOffline', onOffline);
    };
  }, []);

  const handleSearch = async (query) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    if (query.trim().length < 2) return;
    setLoading(true);
    setError('');
    try {
      const res = await API.get(`/api/auth/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${currentUser.token}` },
      });
      const list = res.data?.data ?? res.data;
      setSearchResults(Array.isArray(list) ? list : []);
      setShowResults(true);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative w-full">
      <div className="relative flex items-center bg-ws-surface-alt rounded-lg border border-ws-border focus-within:border-ws-primary focus-within:ring-2 focus-within:ring-ws-primary/10 transition">
        <svg
          className="w-5 h-5 text-ws-text-muted ml-3 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm text-ws-text placeholder-ws-text-muted focus:outline-none min-h-[40px]"
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
            className="pr-3 text-ws-text-muted hover:text-ws-text"
          >
            ✕
          </button>
        )}
      </div>

      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-ws-surface rounded-xl shadow-lg border border-ws-border max-h-80 overflow-y-auto z-50">
          {loading && (
            <div className="flex items-center justify-center py-6 text-sm text-ws-text-muted">
              <span className="animate-pulse">Searching…</span>
            </div>
          )}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50">{error}</div>
          )}
          {!loading && searchResults.length > 0 ? (
            <ul className="divide-y divide-ws-border">
              {searchResults.map((user) => {
                const isOnline = onlineUsers.has((user._id || user.id)?.toString());
                const avatarUrl =
                  user.avatar && user.avatar.trim()
                    ? user.avatar
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=4a154b&color=fff`;
                return (
                  <li key={user._id || user.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectContact(user);
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowResults(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-ws-surface-alt transition text-left"
                    >
                      <div className="relative flex-shrink-0">
                        <img src={avatarUrl} alt={user.name} className="h-10 w-10 rounded-full object-cover" />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-ws-online border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ws-text truncate">{user.name}</p>
                        <p className="text-xs text-ws-text-muted truncate">{user.email}</p>
                      </div>
                      {isOnline && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0">
                          Online
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            !loading && (
              <div className="px-4 py-6 text-center text-sm text-ws-text-muted">
                {searchQuery ? 'No users found' : 'Type to search…'}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
