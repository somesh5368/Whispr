import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import Search from '../Search/Search';
import Contact from '../Contact/Contact';


function Chats() {
  return (
    <div className="h-[540px] w-[25%] border-2 border-opacity-25 border-slate-950">
      <div className="chats w-full h-12  flex justify-around mt-2">
        <span className='font-bold text-2xl font-medium pr-24 '>Chats</span>
        <span className='text-2xl'><FontAwesomeIcon icon={faPlus} /></span>
      </div>
      <div className="features w-full flex justify-around mt-[-10px]">
         <p className='font-semibold'>DIRECT <span className='text-red-500 font-semibold'>*</span></p>
         <p className='font-semibold opacity-70'>GROUP <span className='text-red-500 font-semibold opacity-70'>*</span></p>
         <p className='font-semibold opacity-70'>OTHER <span className='text-red-500 font-semibold opacity-70'>*</span></p>
      </div>

     {/* Search Button */}
      <div className="search">
      <Search/>

      </div>




      {/* Contact */}

    <Contact/>
     


    </div>
  );
}

export default Chats;
