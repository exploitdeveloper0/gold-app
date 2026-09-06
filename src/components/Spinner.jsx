// src/components/Spinner.jsx
import React from 'react';

const Spinner = () => {
  return (
    <div className="fixed inset-0 bg-[#0a0a0a] z-[10000] flex flex-col items-center justify-center gap-4">
      <div className="spinner"></div>
      <div className="text-[#00ff41] font-semibold tracking-wider text-sm uppercase font-mono">
        RAZER GOLD
      </div>
    </div>
  );
};

export default Spinner;