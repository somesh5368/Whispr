import React from 'react';
import img from '../img/img.jpg';
import { SlCamrecorder } from "react-icons/sl";
import { SlCallEnd } from "react-icons/sl";
import { HiOutlinePhotograph } from "react-icons/hi";
import { BsEmojiSmile } from "react-icons/bs";

function Details() {
  return (
    <div className="w-full lg:w-[70%] border-x-2">

      <div className="name p-4 flex justify-between items-center border-2 w-full">
        <div className="photo flex items-center">
          <img src={img} alt="" className="h-10 w-10 sm:h-12 sm:w-12 rounded-full" />
          <div className="ml-4">
            <p className="font-semibold text-xs sm:text-sm">Aarav Singh</p>
            <p className="text-xs opacity-45">Active 20m ago</p>
          </div>
        </div>

        <div className="feature flex mx-2 sm:mx-5">
          <span className="mr-4 sm:mr-7 text-lg sm:text-xl font-semibold"><SlCallEnd /></span>
          <span className="text-lg sm:text-xl"><SlCamrecorder /></span>
        </div>
      </div>

      <div className="other  sm:mt-96 ">
        <div className="flex border-2 h-12 sm:h-14 mx-4 sm:mx-7 rounded-md justify-between">
          {/* Responsive Input Field */}
          <input
            type="text"
            placeholder="Enter your message"
            className="flex-grow p-2 sm:p-3 outline-none border-none focus:ring-0 focus:outline-none text-sm sm:text-base h-full"
          />
          <div className="flex mx-4 sm:mx-8 items-center">
            <span className="text-xl sm:text-2xl opacity-55 mr-2 sm:mr-4"><BsEmojiSmile /></span>
            <span className="text-xl sm:text-2xl opacity-55"><HiOutlinePhotograph /></span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Details;
