import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(10);
  const [autoRedirect, setAutoRedirect] = useState(true);

  useEffect(() => {
    if (!autoRedirect) return;
    const timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    if (countdown === 0) navigate('/login');
    return () => clearInterval(timer);
  }, [countdown, navigate, autoRedirect]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ws-surface">
      <div className="hidden md:flex md:w-1/2 bg-ws-sidebar items-center justify-center p-12">
        <div className="text-center text-ws-text-sidebar">
          <div className="text-8xl font-black text-ws-primary/30 mb-4">404</div>
          <p className="text-ws-text-sidebar-muted">Page not found</p>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-ws-surface-alt">
        <div className="max-w-md w-full text-center md:text-left">
          <h1 className="text-3xl font-bold text-ws-text mb-2">Lost?</h1>
          <p className="text-ws-text-muted mb-6">
            This page doesn't exist or was moved. Head back to chat or sign in.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Link
              to="/main"
              className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg font-medium bg-ws-primary text-white hover:bg-ws-primary-hover transition"
            >
              Go to Chat
            </Link>
            <Link
              to="/login"
              className="inline-flex justify-center items-center px-5 py-2.5 rounded-lg font-medium border border-ws-border text-ws-text hover:bg-ws-surface transition"
            >
              Sign in
            </Link>
          </div>
          {autoRedirect ? (
            <p className="text-sm text-ws-text-muted">
              Redirecting to sign in in <strong>{countdown}s</strong>.{' '}
              <button
                type="button"
                onClick={() => setAutoRedirect(false)}
                className="text-ws-primary hover:underline"
              >
                Cancel
              </button>
            </p>
          ) : (
            <p className="text-sm text-ws-text-muted">
              <button
                type="button"
                onClick={() => setAutoRedirect(true)}
                className="text-ws-primary hover:underline"
              >
                Enable auto-redirect
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotFound;
