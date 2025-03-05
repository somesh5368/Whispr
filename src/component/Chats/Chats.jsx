import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';

function Chats() {
  return (
    <div className="h-[540px] w-[30%] border-2 border-opacity-25 border-slate-950">
      <div className="chats w-full h-12  flex justify-around mt-2">
        <span className='font-bold text-2xl font-medium pr-24 '>Chats</span>
        <span className='text-2xl'><FontAwesomeIcon icon={faPlus} /></span>
      </div>
      <div className="features w-full border-2">features</div>
      <div className="search w-full border-2">search</div>
      <div className="contact w-full border-2">contact</div>
    </div>
  );
}

export default Chats;
