import React from 'react';
import defaultImg from '../img/img.jpg';

function Description({ user }) {
  const { name = "User", img = defaultImg, activeStatus = "unknown" } = user || {};

  return (
    <div className="w-[30%] border-2 bg-white">
      <div className="photo flex justify-center mt-5">
        <img
          src={img}
          alt={name}
          className="h-24 w-24 rounded-full transition-transform hover:scale-105"
        />
      </div>
      <div className="name flex flex-col items-center mt-5">
        <p className="font-semibold">{name}</p>
        <p className="opacity-50 text-sm">Active {activeStatus} ago</p>
      </div>
      <div className="edit flex justify-center mt-10">
        <button
          type="button"
          className="bg-black text-white rounded-md w-36 h-6 font-normal text-sm"
          onClick={() => alert("Edit Profile clicked!")}
        >
          Edit Profile
        </button>
      </div>
      <div className="features"></div>
    </div>
  );
}

export default Description;
