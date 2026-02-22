import React, { useState, useEffect, useMemo } from 'react';
import Header from '../component/Header';
import Chats from '../pages/Chats';
import Details from '../pages/Details';
import { FaArrowLeft, FaPhone, FaVideo, FaEllipsisV } from 'react-icons/fa';

const MOBILE_BREAKPOINT = 768;

const Home = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  const [mobileView, setMobileView] = useState('chats');

  const isMobile = useMemo(() => viewportWidth < MOBILE_BREAKPOINT, [viewportWidth]);

  useEffect(() => {
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => setViewportWidth(window.innerWidth), 150);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleSelectContact = (user) => {
    setSelectedContact(user);
    if (isMobile) setMobileView('chatDetails');
  };

  const handleBackToChats = () => {
    if (isMobile) {
      setMobileView('chats');
      setSelectedContact(null);
    }
  };

  if (!isMobile) {
    return (
      <div className="h-screen flex flex-col bg-ws-surface-alt">
        <Header />
        <div className="flex-1 flex overflow-hidden min-h-0">
          <aside className="w-80 min-w-[280px] max-w-[360px] border-r border-ws-border bg-ws-sidebar flex flex-col overflow-hidden">
            <Chats
              onSelectContact={handleSelectContact}
              selectedContact={selectedContact}
            />
          </aside>
          <main className="flex-1 flex flex-col min-w-0 bg-ws-surface-alt">
            {selectedContact ? (
              <Details
                user={selectedContact}
                onOpenProfile={() => {}}
                onBack={handleBackToChats}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-ws-surface border border-ws-border flex items-center justify-center mx-auto mb-4">
                    <svg
                      className="w-10 h-10 text-ws-text-muted"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 2 13.574 2 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <p className="text-ws-text font-medium">Select a chat</p>
                  <p className="text-sm text-ws-text-muted mt-1">
                    Choose a conversation from the sidebar to start messaging.
                  </p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-ws-surface-alt overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden relative min-h-0">
        {mobileView === 'chats' && (
          <div className="w-full h-full flex flex-col bg-ws-sidebar">
            <Chats
              onSelectContact={handleSelectContact}
              selectedContact={selectedContact}
              isMobile
            />
          </div>
        )}

        {mobileView === 'chatDetails' && selectedContact && (
          <div className="w-full h-full flex flex-col bg-ws-surface-alt">
            <div className="bg-ws-surface border-b border-ws-border px-4 py-3 flex items-center justify-between flex-shrink-0">
              <button
                onClick={handleBackToChats}
                className="p-2 -ml-1 rounded-lg hover:bg-ws-surface-alt text-ws-text transition"
                aria-label="Back to chats"
              >
                <FaArrowLeft className="text-lg" />
              </button>
              <div className="flex-1 px-3 min-w-0">
                <h2 className="font-semibold text-ws-text text-sm truncate">
                  {selectedContact?.name}
                </h2>
                <p className="text-xs text-ws-text-muted">
                  {selectedContact?.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-2.5 rounded-lg hover:bg-ws-surface-alt text-ws-text-muted transition"
                  aria-label="Voice call"
                >
                  <FaPhone size={16} />
                </button>
                <button
                  className="p-2.5 rounded-lg hover:bg-ws-surface-alt text-ws-text-muted transition"
                  aria-label="Video call"
                >
                  <FaVideo size={16} />
                </button>
                <button
                  className="p-2.5 rounded-lg hover:bg-ws-surface-alt text-ws-text-muted transition"
                  aria-label="More"
                >
                  <FaEllipsisV size={16} />
                </button>
              </div>
            </div>
            <Details
              user={selectedContact}
              onOpenProfile={() => {}}
              onBack={handleBackToChats}
              isMobile
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
