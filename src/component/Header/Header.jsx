import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import logo from '../img/logo.png';
import { FaSignOutAlt } from 'react-icons/fa';
import Profile from '../Profile';

function Header() {
  const [showProfile, setShowProfile] = useState(false);

  const user = (() => {
    try {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  })();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const avatarUrl =
    user?.img && user.img.trim()
      ? user.img
      : "https://cdn-icons-png.flaticon.com/512/3177/3177440.png"; // Default avatar

  return (
    <div className="flex justify-between items-center p-4 w-full border-b-2 bg-white shadow-md">
      {/* Left Side */}
      <div className="flex items-center pl-6 space-x-8">
        <img src={logo} alt="Logo" className="h-24" />
        <div className="text-xl font-semibold opacity-70 pl-40">Create memorable talks</div>
      </div>
      {/* Right Side */}
      {user ? (
        <div className="flex items-center pr-8 space-x-4">
          {/* User Avatar - clickable */}
          <img
            src={avatarUrl}
            alt="avatar"
            onClick={() => setShowProfile(true)}
            className="h-10 w-10 rounded-full shadow-md cursor-pointer"
          />
          {/* User Name - clickable */}
          <span
            className="font-semibold text-lg cursor-pointer hover:text-blue-600"
            onClick={() => setShowProfile(true)}
          >{user.name}</span>
          {/* Logout */}
          <div className="relative group">
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white p-2 rounded-full hover:bg-red-700 transition-all duration-200 flex items-center justify-center"
            >
              <FaSignOutAlt className="h-6 w-6" />
            </button>
            <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs bg-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">Logout</span>
          </div>
          {/* Profile Modal */}
          {showProfile && <Profile onClose={() => setShowProfile(false)} />}
        </div>
      ) : (
        <Link to="/login" className="text-blue-600 hover:underline pr-8">Login</Link>
      )}
    </div>
  );
}
export default Header;
