import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../Login/Login.jsx';
import Header from '../Header/Header.jsx';
import Chats from '../Chats/Chats';
import Details from '../Details/Details';
import Description from '../Description/Description';
import bgImg from '../img/bgImg.jpg';
import chatImg from '../img/newchat.jpg';
import Register from '../Register/Register.jsx';

function Home() {
  const [selectedContact, setSelectedContact] = useState(null);

  return (
    <div
      className="h-screen bg-cover bg-center bg-fixed pt-5 pb-5"
      style={{
        backgroundImage: `url(${bgImg})`,
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/main"
          element={
            <div className="mx-auto h-[95vh] w-[160vh] shadow-zinc-900 bg-white text-black rounded-md shadow-lg">
              <Header />
              <div className="flex ">
                <Chats onSelectContact={(contact) => setSelectedContact(contact)} />
                {selectedContact ? (
                  <div className="flex w-full ">
                    <Details user={selectedContact} />
                    <Description user={selectedContact} />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full h-full">
                    <img
                      src={chatImg}
                      alt="No chat selected"
                      className="max-w-2xl max-h-2xl"
                    />
                  </div>
                )}
              </div>
            </div>
          }
        />
      </Routes>
    </div>
  );
}

export default Home;
