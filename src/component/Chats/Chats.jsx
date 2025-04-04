import React from "react";
import Contact from "../Contact/Contact";
import Search from "../Search/Search";

function Chats({ onSelectContact }) {
    return (
        <div className="h-full md:w-[50%] lg:w-[25%] border-2 border-opacity-25 border-slate-950 p-1">
            <div className="chats w-full h-12 flex justify-between items-center mx-2">
                <span className="font-bold text-xl md:text-2xl font-medium">Chats</span>
                <span className="text-2xl md:text-2xl pr-4">+</span>
            </div>
            <div className="features w-full flex justify-around mt-1">
                <p className="font-semibold text-sm md:text-base">DIRECT *</p>
                <p className="font-semibold text-sm md:text-base opacity-70">GROUP *</p>
                <p className="font-semibold text-sm md:text-base opacity-70">OTHER *</p>
            </div>
            <div className="search mt-2">
                <Search />
            </div>
            <div className="contact mt-2">
                <Contact onSelectContact={onSelectContact} />
            </div>
        </div>
    );
}

export default Chats;