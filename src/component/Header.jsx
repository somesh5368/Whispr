import React, { useState, useMemo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FaSignOutAlt, FaBars, FaTimes, FaUser } from 'react-icons/fa';
import Profile from '../pages/Profile';

function Header() {
  const [showProfile, setShowProfile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const userData = useMemo(() => {
    try {
      const data = localStorage.getItem('user');
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }, []);

  const user = userData?.user || userData;
  const avatarUrl =
    user?.avatar && String(user.avatar).trim()
      ? user.avatar
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          user?.name || user?.email || 'User'
        )}&background=4a154b&color=fff`;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setMobileMenuOpen(false);
    navigate('/login', { replace: true });
  };

  const isAuthPage =
    location.pathname === '/login' || location.pathname === '/register';

  if (isAuthPage) {
    return (
      <header className="w-full border-b border-indigo-200/50 bg-white sticky top-0 z-40 shadow-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            <Link
              to="/"
              className="flex items-center gap-2.5 flex-shrink-0"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-indigo-500/30">
                W
              </div>
              <span className="text-lg font-bold text-slate-800">Whispr</span>
            </Link>
            <nav className="hidden sm:flex items-center gap-6">
              <Link
                to="/login"
                className={`text-sm font-medium ${
                  location.pathname === '/login'
                    ? 'text-indigo-600'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg shadow-indigo-500/25 transition"
              >
                Sign up
              </Link>
            </nav>
            <div className="sm:hidden w-9" />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {showProfile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-ws-surface rounded-2xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-hidden flex flex-col">
            <button
              onClick={() => setShowProfile(false)}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-ws-surface-alt text-ws-text-muted hover:text-ws-text z-10 transition"
              aria-label="Close"
            >
              <FaTimes className="text-lg" />
            </button>
            <Profile onClose={() => setShowProfile(false)} />
          </div>
        </div>
      )}

      <header className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white sticky top-0 z-30 shadow-elevated">
        <div className="mx-auto max-w-full px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 gap-4">
            <Link
              to="/main"
              className="flex items-center gap-2.5 group flex-shrink-0 min-w-0"
            >
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0 border border-white/30">
                W
              </div>
              <div className="hidden sm:flex flex-col leading-tight min-w-0">
                <span className="text-base font-bold truncate">Whispr</span>
                <span className="text-xs text-white/80">Chat</span>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setShowProfile(true);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 transition backdrop-blur"
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover border-2 border-white/40"
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-400 rounded-full border-2 border-indigo-600" />
                </div>
                <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
                  {user?.name || user?.email || 'User'}
                </span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="p-2.5 rounded-xl text-white/90 hover:text-white hover:bg-white/20 transition"
              >
                <FaSignOutAlt className="text-base" />
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2.5 rounded-xl hover:bg-white/20 text-white transition"
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <FaTimes className="text-lg" />
                ) : (
                  <FaBars className="text-lg" />
                )}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden pb-4 pt-2 border-t border-white/20">
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => {
                    setShowProfile(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-white/15 text-left text-sm font-medium"
                >
                  <FaUser className="text-white/80" />
                  View profile
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 w-full px-4 py-3 rounded-xl hover:bg-red-500/30 text-red-200 hover:text-white text-left text-sm font-medium"
                >
                  <FaSignOutAlt />
                  Log out
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
