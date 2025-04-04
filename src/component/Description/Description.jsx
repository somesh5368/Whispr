import React from 'react';
import defaultImg from '../img/img.jpg';

function Description({ user }) {
  // Use fallback values if 'user' is not defined
  const { name = "Aarav Singh", img = defaultImg, activeStatus = "20m" } = user || {};

  return (
    <div className="w-[30%] border-2 p-4 bg-white">
      {/* User Photo */}
      <div className="photo flex justify-center mt-5">
        <img
          src={img}
          alt={name}
          className="h-24 w-24 rounded-full transition-transform hover:scale-105"
        />
      </div>

      {/* User Details */}
      <div className="name flex flex-col items-center mt-5">
        <p className="font-semibold">{name}</p>
        <p className="opacity-50 text-sm">Active {activeStatus} ago</p>
      </div>

      {/* Edit Profile Button */}
      <div className="edit flex justify-center mt-10">
        <button
          type="button"
          className="bg-black text-white rounded-md w-36 h-6 font-normal text-sm"
          onClick={() => alert("Edit Profile clicked!")}
        >
          Edit Profile
        </button>
      </div>
      
      {/* Additional features can be added here */}
      <div className="features"></div>
    </div>
  );
}

export default Description;