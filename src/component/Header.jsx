// src/component/Header.jsx
import React, { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaSignOutAlt } from "react-icons/fa";
import logo from "../component/img/logo.png";
import Profile from "../pages/Profile";

function Header() {
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const user = useMemo(() => {
    try {
      const data = localStorage.getItem("user");
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  const avatarUrl =
    user?.img && user.img.trim()
      ? user.img
      : "https://cdn-icons-png.flaticon.com/512/3177/3177440.png";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  // Simple header on auth pages
  if (isAuthPage) {
    return (
      <header className="w-full border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Whispr" className="h-7 w-auto" />
            <span className="text-sm font-semibold text-[#0f172a]">
              Whispr
            </span>
          </div>
          <nav className="flex items-center gap-3 text-xs text-gray-500">
            <Link
              to="/login"
              className={`hover:text-[#0f172a] ${
                location.pathname === "/login" ? "text-[#0f172a]" : ""
              }`}
            >
              Login
            </Link>
            <Link
              to="/register"
              className={`hover:text-[#0f172a] ${
                location.pathname === "/register" ? "text-[#0f172a]" : ""
              }`}
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Profile modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
          <div className="bg-transparent w-full max-w-md mx-4">
            <Profile onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}

      {/* Main app header with new color */}
      <header className="w-full bg-[#0ea5e9] text-white shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center">
              <img
                src={logo}
                alt="Whispr"
                className="h-6 w-6 object-contain"
              />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-wide">
                Whispr
              </span>
              <span className="text-[10px] text-sky-100">
                Simple and secure chat
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[#1d4ed8] hover:bg-[#1e40af] text-xs shadow-sm"
            >
              <img
                src={avatarUrl}
                alt="Profile"
                className="h-6 w-6 rounded-full object-cover border border-white/40"
              />
              <span className="hidden sm:inline max-w-[130px] truncate">
                {user?.name || user?.user?.name || user?.email || "Profile"}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full bg-white/15 hover:bg-white/25"
            >
              <FaSignOutAlt className="text-[12px]" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
    </>
  );
}

export default Header;
