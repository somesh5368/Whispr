import React from 'react';
import bgImg from '../img/bgImg.jpg';
import Header from '../Header/Header';

function Home() {
    return (
        <div
            style={{
                backgroundImage: `url(${bgImg})`,
                minHeight: '100vh', // Minimum height for full-page scrolling
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundAttachment: 'fixed', // Keeps the background fixed
                overflow: 'hidden', // Prevent scroll issues
            }}
        >
          

            {/* Centered child div */}
            <div className=" mx-auto h-[95vh] w-[160vh] mt-5 shadow-zinc-900 bg-white text-black  rounded-md shadow-lg">
                <Header/>
            </div>
        </div>
    );
}

export default Home;
