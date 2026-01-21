import React, { useState, useEffect } from 'react';
import { API } from '../utils/api';

const Search = ({ currentUser, onSelectContact }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Fetch online users
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      if (!currentUser?.token) return;
      try {
        const res = await API.get('/api/users/online', {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        });
        setOnlineUsers(new Set(res.data.onlineUsers || []));
      } catch (err) {
        console.error('❌ Failed to fetch online users:', err);
      }
    };

    fetchOnlineUsers();
  }, [currentUser?.token]);

  // ============================================
  // SEARCH HANDLER (✅ NOW FIXED!)
  // ============================================
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
        headers: {
          Authorization: `Bearer ${currentUser.token}`,
        },
      });

      setSearchResults(Array.isArray(res.data) ?
 res.data : []);
      setShowResults(true);
    } catch (err) {
      console.error('❌ Search error:', err);
      setError('Failed to search users');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative">
      {/* ===== SEARCH INPUT ===== */}
      <div className="relative flex items-center bg-gray-50 rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200 transition-all">
        <svg
          className="w-5 h-5 text-gray-400 ml-3 flex-shrink-0"
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
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 bg-transparent px-3 py-2.5 text-sm placeholder-gray-500 focus:outline-none"
        />

        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSearchResults([]);
              setShowResults(false);
            }}
            className="pr-3 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* ===== SEARCH RESULTS DROPDOWN ===== */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 max-h-80 overflow-y-auto z-50">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-4 text-sm text-gray-500">
              <div className="animate-spin">⟳</div> Searching...
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="px-4 py-3 text-sm text-red-600 bg-red-50">
              {error}
            </div>
          )}

          {/* Results */}
          {!loading && searchResults.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {searchResults.map((user) => {
                const isOnline = onlineUsers.has(user._id?.toString());
                const avatarUrl =
                  user.avatar && user.avatar.trim()
                    ? user.avatar
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        user.name || 'User'
                      )}&background=0D8ABC&color=fff`;

                return (
                  <li key={user._id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectContact(user);
                        setSearchQuery('');
                        setSearchResults([]);
                        setShowResults(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-blue-50"
                    >
                      {/* Avatar */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={avatarUrl}
                          alt={user.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-white" />
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {isOnline && (
                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex-shrink-0">
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
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                {searchQuery ? 'No users found' : 'Start typing to search...'}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

export default Search;
