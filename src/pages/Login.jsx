import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import  socket  from '../utils/socket';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // ✅ FIXED: Use environment variable for API URL
  const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'https://whispr-j7jw.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { email, password },
        { withCredentials: true }
      );

      const { token, user } = res.data;

      // Store user data in localStorage
      localStorage.setItem(
        'user',
        JSON.stringify({
          ...user,
          token,
        })
      );

      // ✅ FIXED: Proper Socket.IO connection
      if (socket.connected) {
        socket.emit('join', user._id);
      } else {
        socket.once('connect', () => {
          socket.emit('join', user._id);
        });
      }

      setSuccess('Login successful!');

      // Navigate to main chat page
      setTimeout(() => {
        navigate('/main');
      }, 600);
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        'Invalid email or password. Please try again.';
      setError(msg);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-2">
          Welcome back to Whispr
        </h1>
        <p className="text-center text-xs sm:text-sm text-gray-500 mb-6">
          Sign in to continue chatting with your friends.
        </p>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs sm:text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div
            role="status"
            className="mb-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs sm:text-sm text-green-600"
          >
            {success}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              placeholder="you@example.com"
            />
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-600 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
              placeholder="••••••••"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2.5 text-sm font-semibold rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Register Link */}
        <p className="mt-4 text-center text-xs sm:text-sm text-gray-500">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
