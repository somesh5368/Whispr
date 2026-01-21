import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  // Auto-redirect to login after 10 seconds
  useEffect(() => {
    if (!autoRedirect) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    if (countdown === 0) {
      navigate('/login');
    }

    return () => clearInterval(timer);
  }, [countdown, navigate, autoRedirect]);

  const handleCancel = () => {
    setAutoRedirect(false);
    setCountdown(10);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center px-4 py-6 overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full translate-x-1/2 translate-y-1/2 animate-pulse" />

      {/* Main Content */}
      <div className="relative z-10 text-center max-w-2xl mx-auto">
        {/* Floating Animation */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          .animate-float {
            animation: float 3s ease-in-out infinite;
          }
        `}</style>

        {/* 404 Large Number */}
        <div className="animate-float mb-6">
          <div className="text-9xl sm:text-[150px] font-black text-white opacity-20 leading-none">
            404
          </div>
        </div>

        {/* Icon/Emoji */}
        <div className="text-7xl sm:text-8xl mb-6 animate-bounce">
          🚀
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
          Page Not Found
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl md:text-2xl text-blue-100 mb-6 opacity-90">
          Oops! The page you're looking for has disappeared into the digital void.
        </p>

        {/* Description */}
        <p className="text-sm sm:text-base text-blue-50 mb-8 max-w-md mx-auto opacity-75 leading-relaxed">
          The page might have been removed, or the URL might be incorrect. Don't worry, let's get
          you back on track!
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8 sm:mb-12">
          {/* Go to Chat Button */}
          <Link
            to="/main"
            className="px-8 py-3 sm:py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-base sm:text-lg"
          >
            💬 Go to Chat
          </Link>

          {/* Go to Login Button */}
          <Link
            to="/login"
            className="px-8 py-3 sm:py-4 bg-blue-400 text-white font-bold rounded-lg hover:bg-blue-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-base sm:text-lg"
          >
            🔐 Sign In
          </Link>

          {/* Go Home Button */}
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 sm:py-4 bg-purple-400 text-white font-bold rounded-lg hover:bg-purple-300 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-base sm:text-lg"
          >
            🏠 Go Home
          </button>
        </div>

        {/* Auto-Redirect Info */}
        <div className="bg-white bg-opacity-10 backdrop-blur-sm rounded-lg px-4 sm:px-6 py-4 border border-white border-opacity-20 mb-6">
          {autoRedirect ? (
            <div className="space-y-2">
              <p className="text-white font-semibold">
                Redirecting to login in{' '}
                <span className="text-yellow-300 font-bold text-lg">{countdown}s</span>
              </p>
              <button
                onClick={handleCancel}
                className="text-sm text-blue-100 hover:text-white underline transition-colors"
              >
                Cancel auto-redirect
              </button>
            </div>
          ) : (
            <p className="text-white">
              Auto-redirect cancelled.{' '}
              <button
                onClick={() => setAutoRedirect(true)}
                className="text-blue-100 hover:text-blue-50 underline transition-colors"
              >
                Enable again
              </button>
            </p>
          )}
        </div>

        {/* Error Details */}
        <div className="text-left bg-white bg-opacity-5 rounded-lg px-4 sm:px-6 py-4 border border-white border-opacity-10 mb-8">
          <p className="text-xs sm:text-sm text-blue-100 opacity-75 font-mono">
            <span className="text-red-300">Error:</span> 404 Not Found
            <br />
            <span className="text-yellow-300">Path:</span> {window.location.pathname}
            <br />
            <span className="text-green-300">Status:</span> Page does not exist
          </p>
        </div>

        {/* Helpful Links */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          <Link
            to="/main"
            className="text-sm bg-white bg-opacity-10 hover:bg-opacity-20 text-white py-2 px-3 rounded transition-all"
          >
            Chat
          </Link>
          <Link
            to="/login"
            className="text-sm bg-white bg-opacity-10 hover:bg-opacity-20 text-white py-2 px-3 rounded transition-all"
          >
            Login
          </Link>
          <Link
            to="/register"
            className="text-sm bg-white bg-opacity-10 hover:bg-opacity-20 text-white py-2 px-3 rounded transition-all"
          >
            Register
          </Link>
        </div>

        {/* Footer Message */}
        <div className="mt-12 text-center">
          <p className="text-blue-100 text-xs sm:text-sm opacity-75">
            💡 Still need help?{' '}
            <a
              href="https://github.com/somesh5368/Whispr"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-blue-200 underline transition-colors"
            >
              View Documentation
            </a>
          </p>
        </div>
      </div>

      {/* Floating Stars Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute text-white text-2xl opacity-20 animate-pulse"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotFound;
