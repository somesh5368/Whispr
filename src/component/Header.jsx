import React, { useState, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FaSignOutAlt, FaMenu, FaX } from "react-icons/fa6";
import logo from "../components/img/logo.png";
import Profile from "../pages/Profile";

function Header() {
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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

  // Fixed: Use avatar instead of img
  const avatarUrl =
    user?.avatar && user.avatar.trim()
      ? user.avatar
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user?.name || user?.email || "User"
        )}&background=0D8ABC&color=fff`;

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const isAuthPage =
    location.pathname === "/login" || location.pathname === "/register";

  // ============================================
  // SIMPLE HEADER FOR AUTH PAGES
  // ============================================
  if (isAuthPage) {
    return (
      <header className="w-full border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
                <img
                  src={logo}
                  alt="Whispr"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <span className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                Whispr
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden sm:flex items-center gap-6">
              <Link
                to="/login"
                className={`text-sm font-medium transition-colors ${
                  location.pathname === "/login"
                    ? "text-blue-600"
                    : "text-gray-600 hover:text-blue-600"
                }`}
              >
                Login
              </Link>
              <Link
                to="/register"
                className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors ${
                  location.pathname === "/register"
                    ? "bg-blue-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Sign up
              </Link>
            </nav>

            {/* Mobile Menu Button */}
            <button className="sm:hidden text-gray-600 hover:text-blue-600">
              <FaMenu className="text-xl" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  // ============================================
  // MAIN APP HEADER
  // ============================================
  return (
    <>
      {/* Profile Modal */}
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <FaX className="text-gray-600" />
            </button>
            <Profile onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}

      {/* Main Header */}
      <header className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 text-white shadow-lg sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo */}
            <Link
              to="/main"
              className="flex items-center gap-3 group hover:opacity-90 transition-opacity"
            >
              <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors border border-white/30">
                <img
                  src={logo}
                  alt="Whispr"
                  className="h-6 w-6 object-contain"
                />
              </div>
              <div className="flex flex-col leading-tight hidden sm:block">
                <span className="text-base font-bold tracking-tight">
                  Whispr
                </span>
                <span className="text-xs text-blue-100 opacity-90">
                  Chat securely
                </span>
              </div>
            </Link>

            {/* Right: User Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Profile Button */}
              <button
                type="button"
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 px-2 sm:px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-all duration-200 border border-white/20 hover:border-white/40 group"
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover border-2 border-white/40 group-hover:border-white/60 transition-colors"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-400 rounded-full border-2 border-white"></span>
                </div>

                {/* Name */}
                <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate text-white">
                  {user?.name || user?.user?.name || user?.email || "Profile"}
                </span>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                title="Logout"
                className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 rounded-full bg-white/15 hover:bg-red-500/30 backdrop-blur-sm transition-all duration-200 border border-white/20 hover:border-red-400/40 group text-white hover:text-white"
              >
                <FaSignOutAlt className="text-sm" />
                <span className="hidden sm:inline text-sm font-medium">
                  Logout
                </span>
              </button>

              {/* Mobile Menu Button */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              >
                {mobileMenuOpen ? (
                  <FaX className="text-lg" />
                ) : (
                  <FaMenu className="text-lg" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="sm:hidden pb-4 border-t border-white/20 mt-2 pt-4">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowProfile(true);
                    setMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm"
                >
                  📋 View Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-colors text-sm text-red-200"
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </header>
    </>
  );
}

export default Header;
