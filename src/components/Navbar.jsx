// src/components/Navbar.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <div className="bg-[#0f0f0f] px-5 py-4 border-b border-[#1f1f1f] flex justify-between items-center flex-wrap gap-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        <h1 className="text-[#00ff41] text-xl tracking-wider font-bold">RΛZER</h1>
        <span className="text-[#888] text-xs">Gold & Silver</span>
      </div>
      <div className="flex gap-3 items-center">
        <Link to="/" className="text-[#ccc] text-xs hover:text-[#00ff41] transition">HOME</Link>
        <Link to="/scan" className="text-[#ccc] text-xs hover:text-[#00ff41] transition">SCAN</Link>
        <button 
          onClick={() => alert('Sign in - demo')}
          className="bg-transparent border border-[#00ff41] text-[#00ff41] px-4 py-1.5 rounded-md font-bold text-xs hover:bg-[#00ff41] hover:text-[#0a0a0a] transition"
        >
          SIGN IN
        </button>
      </div>
    </div>
  );
};

export default Navbar;