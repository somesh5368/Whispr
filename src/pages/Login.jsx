import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import socket from '../utils/socket';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        { email: email.trim().toLowerCase(), password },
        { withCredentials: true }
      );

      const payload = res.data?.data || res.data;
      const user = payload?.user;
      const token = payload?.token;

      if (!user || !token) {
        setError('Invalid response from server. Please try again.');
        setLoading(false);
        return;
      }

      localStorage.setItem(
        'user',
        JSON.stringify({
          user: { ...user, id: user.id || user._id },
          token,
        })
      );

      const userId = user.id || user._id;
      if (userId) {
        if (socket.connected) {
          socket.emit('join', { userId });
        } else {
          socket.once('connect', () => socket.emit('join', { userId }));
        }
      }

      setSuccess('Login successful!');
      setTimeout(() => navigate('/main'), 600);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          'Invalid email or password. Please try again.'
      );
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ws-surface">
      {/* Left: Branding (desktop) */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-700 text-white flex-col justify-center px-12 lg:px-20 py-12 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-80" />
        <div className="max-w-md relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold text-white shadow-xl border border-white/30">
              W
            </div>
            <span className="text-2xl font-bold tracking-tight">Whispr</span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            Real-time messaging for your team
          </h1>
          <p className="text-white/90 text-base leading-relaxed">
            Sign in to continue your conversations. Secure, fast, and always in sync.
          </p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 md:py-12 bg-gradient-to-br from-slate-50 to-indigo-50/30">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-elevated p-8 border border-slate-100">
          {/* Mobile logo */}
          <div className="md:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg">
              W
            </div>
            <span className="text-xl font-bold text-slate-800">Whispr</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-6">
            Sign in to your account to continue.
          </p>

          {error && (
            <div
              role="alert"
              className="mb-4 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700"
            >
              {error}
            </div>
          )}
          {success && (
            <div
              role="status"
              className="mb-4 rounded-lg bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-700"
            >
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ws-text mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-ws-surface border border-ws-border rounded-lg text-ws-text placeholder-ws-text-muted focus:ring-2 focus:ring-ws-primary/20 focus:border-ws-primary transition"
                placeholder="name@company.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ws-text mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-ws-surface border border-ws-border rounded-lg text-ws-text placeholder-ws-text-muted focus:ring-2 focus:ring-ws-primary/20 focus:border-ws-primary transition"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-medium text-indigo-600 hover:text-indigo-700"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
