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
          { headers: { Authorization: `Bearer ${currentUser.token}` } }
        );
        setSearchResults(res.data);
      } catch (err) {
        setSearchResults([]);
        console.error("Search failed", err);
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
        { headers: { Authorization: `Bearer ${currentUser.token}` } }
      );
      onSelectContact(user);
    } catch (err) {
      console.error("Chat start failed", err);
    }
  };

  if (!currentUser || !currentUser.token) return null;

  return (
    <div className="p-2">
      <input
        type="text"
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-2 rounded border focus:outline-none focus:ring"
      />
      {loading && <p className="text-xs text-gray-500 mt-1">Searching...</p>}
      {searchResults.length > 0 && (
        <ul className="mt-2 bg-white rounded shadow-lg max-h-48 overflow-y-auto z-10 relative">
          {searchResults.map((user) => (
            <li
              key={user._id}
              onClick={() => handleUserClick(user)}
              className="p-2 cursor-pointer hover:bg-gray-100"
            >
              {user.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
export default Search;
