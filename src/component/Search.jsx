// src/component/Search.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const Search = ({ currentUser, onSelectContact }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!searchQuery.trim() || !currentUser?.token) {
        setSearchResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await axios.get(
          `http://localhost:5000/api/users/search?q=${searchQuery}`,
          {
            headers: { Authorization: `Bearer ${currentUser.token}` },
          }
        );
        setSearchResults(res.data);
      } catch (err) {
        console.error("Search failed", err);
        setSearchResults([]);
      }
      setLoading(false);
    };

    const delayDebounce = setTimeout(fetchResults, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchQuery, currentUser?.token]);

  const handleUserClick = async (user) => {
    setSearchQuery("");
    setSearchResults([]);
    try {
      await axios.post(
        "http://localhost:5000/api/messages",
        {
          senderId: currentUser._id,
          receiverId: user._id,
          message: "Hello 👋",
        },
        {
          headers: { Authorization: `Bearer ${currentUser.token}` },
        }
      );
      if (onSelectContact) onSelectContact(user);
    } catch (err) {
      console.error("Chat start failed", err);
    }
  };

  if (!currentUser || !currentUser.token) return null;

  return (
    <div className="w-full">
      <input
        type="text"
        className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />

      {loading && (
        <div className="text-xs text-gray-500 mt-1">Searching...</div>
      )}

      {searchResults.length > 0 && (
        <div className="mt-2 max-h-56 overflow-y-auto bg-white border rounded-md shadow-sm">
          {searchResults.map((user) => (
            <button
              key={user._id}
              type="button"
              onClick={() => handleUserClick(user)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center"
            >
              <span className="text-sm">{user.name || user.email}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Search;
