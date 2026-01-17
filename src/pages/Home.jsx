// src/pages/Home.jsx
import React, { useState, useEffect, useMemo } from "react";
import Header from "../component/Header";
import Chats from "../pages/Chats";
import Details from "../pages/Details";
import { FaComments } from "react-icons/fa";

const MOBILE_BREAKPOINT = 768;

const Home = () => {
  const [selectedContact, setSelectedContact] = useState(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);
  const [mobileView, setMobileView] = useState("chats"); // 'chats' | 'chatDetails'

  const isMobile = useMemo(
    () => viewportWidth < MOBILE_BREAKPOINT,
    [viewportWidth]
  );

  useEffect(() => {
    let t;
    const handleResize = () => {
      clearTimeout(t);
      t = setTimeout(() => setViewportWidth(window.innerWidth), 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const handleSelectContact = (user) => {
    setSelectedContact(user);
    if (isMobile) setMobileView("chatDetails");
  };

  const handleBackToChats = () => {
    if (isMobile) setMobileView("chats");
  };

  const handleOpenProfile = () => {
    // future: right side profile / modal
  };

  const showFloatingIcon = isMobile && mobileView === "chatDetails";

  return (
    <div className="h-screen flex flex-col bg-[#f0f2f5]">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* DESKTOP / TABLET */}
        {!isMobile && (
          <div className="flex w-full h-full">
            <aside className="w-[30%] min-w-[260px] border-r border-gray-200 bg-white h-full">
              <Chats onSelectContact={handleSelectContact} />
            </aside>

            <main className="flex-1 bg-[#eae6df] h-full">
              <Details
                user={selectedContact}
                onOpenProfile={handleOpenProfile}
                layout="desktop"
              />
            </main>
          </div>
        )}

        {/* MOBILE */}
        {isMobile && (
          <div className="relative flex-1 flex bg-[#f0f2f5] h-full">
            {mobileView === "chats" && (
              <div className="w-full h-full bg-white">
                <Chats onSelectContact={handleSelectContact} />
              </div>
            )}

            {mobileView === "chatDetails" && (
              <div className="w-full h-full bg-[#eae6df]">
                <Details
                  user={selectedContact}
                  onOpenProfile={handleOpenProfile}
                  onBack={handleBackToChats}
                  layout="mobile"
                />
              </div>
            )}

            {/* Icon – sirf jab details open ho, top-right pe */}
            {showFloatingIcon && (
              <button
                type="button"
                onClick={() => setMobileView("chats")}
                className="fixed top-24 right-4 z-30 h-10 w-10 rounded-full bg-[#008069] shadow-lg flex items-center justify-center text-white active:scale-95 transition-transform"
                aria-label="Back to chats"
              >
                <FaComments size={18} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
