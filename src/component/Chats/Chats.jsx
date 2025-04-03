import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import Search from '../Search/Search';
import Contact from '../Contact/Contact';

function Chats() {
  return (
    <div className="h-full  md:w-[50%] lg:w-[25%] border-2 border-opacity-25 border-slate-950 p-1">
      <div className="chats w-full h-12 flex justify-between items-center mx-2">
        <span className="font-bold text-xl md:text-2xl font-medium">Chats</span>
        <span className="text-2xl md:text-2xl pr-4"><FontAwesomeIcon icon={faPlus} /></span>
      </div>
      <div className="features w-full flex justify-around mt-1">
        <p className="font-semibold text-sm md:text-base">DIRECT <span className="text-red-500 font-semibold">*</span></p>
        <p className="font-semibold text-sm md:text-base opacity-70">GROUP <span className="text-red-500 font-semibold opacity-70">*</span></p>
        <p className="font-semibold text-sm md:text-base opacity-70">OTHER <span className="text-red-500 font-semibold opacity-70">*</span></p>
      </div>

      {/* Search Button */}
      <div className="search mt-2">
        <Search />
      </div>

      {/* Contact */}
      <div className="contact mt-2">
        <Contact />
      </div>
    </div>
  );
}

export default Chats;
