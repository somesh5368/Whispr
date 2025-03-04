import React from 'react';
import logo from '../img/logo.png';

function Header() {
  return (
    <div className="flex justify-between items-start p-4">
      <div className="logo">
        <img src={logo} alt="Logo" className="h-44" />
      </div>
      <div className="text">
        hello
      </div>
    </div>
  );
}

export default Header;
