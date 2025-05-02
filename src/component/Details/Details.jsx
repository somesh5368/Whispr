import React, { useState } from 'react';
import { SlCamrecorder, SlCallEnd } from 'react-icons/sl';
import { HiOutlinePhotograph } from 'react-icons/hi';
import { BsEmojiSmile } from 'react-icons/bs';
import { IoIosSend } from 'react-icons/io'; // Import Send Icon

function Details({ user }) {
  // State to track the input value
  const [message, setMessage] = useState("");

  return (
    <div className="w-[70%] h-[480px] border-x-2">
      {/* User Information */}
      <div className="name p-4 flex justify-between items-center border-2 w-full">
        <div className="photo flex items-center">
          <img
            src={user.img}
            alt={user.name}
            className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
          />
          <div className="ml-4">
            <p className="font-semibold text-xs sm:text-sm">{user.name}</p>
            <p className="text-xs opacity-45">Active {user.activeStatus} ago</p>
          </div>
        </div>
        <div className="feature flex mx-2 sm:mx-5">
          <span className="mr-4 sm:mr-7 text-lg sm:text-xl font-semibold">
            <SlCallEnd />
          </span>
          <span className="text-lg sm:text-xl">
            <SlCamrecorder />
          </span>
        </div>
      </div>

      {/* Input for Messaging */}
      <div className="other sm:mt-80">
        <div className="flex border-2 h-12 sm:h-14 mx-4 sm:mx-7 rounded-md justify-between">
          <input
            type="text"
            placeholder="Enter your message"
            value={message} // Bind input value to state
            onChange={(e) => setMessage(e.target.value)} // Update state on input
            className="flex-grow p-2 sm:p-3 outline-none border-none focus:ring-0 focus:outline-none text-sm sm:text-base h-full"
          />
          <div className="flex mx-4 sm:mx-1 items-center">
            {/* Send icon: Only appears when there's input */}
            {message && (
              <span className="text-xl sm:text-3xl text-blue-500 cursor-pointer mr-2">
                <IoIosSend />
              </span>
            )}
            {/* Emoji and Photo icons */}
            <span className="text-xl sm:text-2xl opacity-55 mr-1 sm:mr-4">
              <BsEmojiSmile />
            </span>
            <span className="text-xl sm:text-2xl opacity-55 mr-1 sm:mr-4">
              <HiOutlinePhotograph />
            </span>
            
          </div>
        </div>
      </div>
    </div>
  );
}

export default Details;