import React, { useState, useEffect, useMemo, useRef } from 'react';
import Header from '../component/Header';
import Chats from '../pages/Chats';
import Details from '../pages/Details';
import { FaArrowLeft, FaPhone, FaVideo, FaEllipsisV } from 'react-icons/fa';
import { useLocation } from 'react-router-dom';

const MOBILE_BREAKPOINT = 768;

const Home = () => {
  // State management
  const [selectedContact, setSelectedContact] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [mobileView, setMobileView] = useState('chats'); // 'chats' or 'chatDetails'
  const [isLoading, setIsLoading] = useState(false);
  const [chats, setChats] = useState([]);
  const location = useLocation();

  // Detect mobile view
  const isMobile = useMemo(() => viewportWidth < MOBILE_BREAKPOINT, [viewportWidth]);

  // Handle window resize
  useEffect(() => {
    let resizeTimeout;

    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setViewportWidth(window.innerWidth);
      }, 150);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(resizeTimeout);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Handle contact selection
  const handleSelectContact = (user) => {
    setSelectedContact(user);
    if (isMobile) {
      setMobileView('chatDetails'); // Switch to chat details view on mobile
    }
  };

  // Handle back button on mobile
  const handleBackToChats = () => {
    if (isMobile) {
      setMobileView('chats');
      setSelectedContact(null);
    }
  };

  // Handle opening profile (passed to Details component)
  const handleOpenProfile = () => {
    // This will be triggered from the Details component
    // Profile modal is handled in Header component
  };

  // Show back button on mobile when viewing chat details
  const showBackButton = isMobile && mobileView === 'chatDetails';

  // =====================
  // DESKTOP/TABLET LAYOUT
  // =====================
  if (!isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <Header />

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Chat List */}
          <aside className="w-72 min-w-[300px] border-r border-gray-300 bg-white h-full flex flex-col shadow-sm">
            <Chats onSelectContact={handleSelectContact} selectedContact={selectedContact} />
          </aside>

          {/* Right Panel - Chat Details */}
          <main className="flex-1 bg-gray-50 h-full flex flex-col">
            {selectedContact ? (
              <Details 
                user={selectedContact} 
                onOpenProfile={handleOpenProfile}
                onBack={handleBackToChats}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-medium">Select a chat to start messaging</p>
                  <p className="text-gray-400 text-sm mt-2">Choose a friend to start the conversation</p>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    );
  }

  // =====================
  // MOBILE LAYOUT
  // =====================
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <Header />

      {/* Mobile Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chat List View - Mobile */}
        {mobileView === 'chats' && (
          <div className="w-full h-full bg-white flex flex-col">
            <Chats 
              onSelectContact={handleSelectContact}
              selectedContact={selectedContact}
              isMobile={true}
            />
          </div>
        )}

        {/* Chat Details View - Mobile */}
        {mobileView === 'chatDetails' && selectedContact && (
          <div className="w-full h-full bg-gray-50 flex flex-col">
            {/* Mobile Chat Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <button
                onClick={handleBackToChats}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Back to chats"
              >
                <FaArrowLeft className="text-gray-700" size={18} />
              </button>
              
              <div className="flex-1 px-3">
                <h2 className="font-semibold text-gray-900 text-sm">{selectedContact?.name}</h2>
                <p className="text-xs text-gray-500">
                  {selectedContact?.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Voice call">
                  <FaPhone className="text-gray-700" size={16} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Video call">
                  <FaVideo className="text-gray-700" size={16} />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="More options">
                  <FaEllipsisV className="text-gray-700" size={16} />
                </button>
              </div>
            </div>

            {/* Chat Details */}
            <Details 
              user={selectedContact}
              onOpenProfile={handleOpenProfile}
              onBack={handleBackToChats}
              isMobile={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
