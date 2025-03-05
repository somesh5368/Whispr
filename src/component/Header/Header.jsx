import React from 'react';
import logo from '../img/logo.png';

function Header() {
  return (
    <div className="flex justify-center border-b-2 w-full ">
      <div className="logo">
        <img src={logo} alt="Logo" className="h-32 pr-32" />
      </div>
      <div className="text flex pl-[400px] opacity-70 items-center text-xl font-semibold">
        Create memorable talks
      </div>
    </div>
  );
}

export default Header;
