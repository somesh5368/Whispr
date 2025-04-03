import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../Login/Login.jsx';
import Header from '../Header/Header.jsx';
import Chats from '../Chats/Chats';
import Details from '../Details/Details';
import Description from '../Description/Description';
import bgImg from '../img/bgImg.jpg';

function Home() {
    return (
        <div
            style={{
                backgroundImage: `url(${bgImg})`,
                Height: '100%',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed',
            }}
        >
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                <Route
                    path="/main"
                    element={
                        <div className="mx-auto h-[95vh] w-[160vh] mt-5 shadow-zinc-900 bg-white text-black rounded-md shadow-lg">
                            <Header />
                            <div className="flex">
                                <Chats />
                                <Details />
                                <Description />
                            </div>
                        </div>
                    }
                />
            </Routes>
        </div>
    );
}

export default Home;