// src/components/LegalDisclaimer.jsx
import React from 'react';

const LegalDisclaimer = () => {
  return (
    <div className="bg-[#0a0a0a] border-t border-[#1f1f1f] mt-8 pt-6">
      <div className="text-center text-[#666] text-[0.65rem] space-y-2 max-w-2xl mx-auto px-4">
        <p className="leading-relaxed">
          ⚠️ <strong className="text-[#888]">DISCLAIMER:</strong> This is an independent demonstration project. 
          Razer™, Razer Gold™, and related logos are trademarks of Razer Inc. 
          This website is NOT affiliated with, endorsed by, or sponsored by Razer Inc.
        </p>
        <p className="leading-relaxed">
          🔐 For testing purposes only. No real gift card balances are checked or stored. 
          All data entered is simulated for demonstration.
        </p>
        <p className="leading-relaxed">
          📧 Email notifications are for development testing only. 
          No financial transactions occur on this platform.
        </p>
        <div className="pt-2 text-[#555] text-[0.6rem]">
          <a href="/privacy" className="hover:text-[#888] transition mx-2">Privacy Policy</a>
          <span>•</span>
          <a href="/terms" className="hover:text-[#888] transition mx-2">Terms of Service</a>
          <span>•</span>
          <span>Demo v1.0</span>
        </div>
      </div>
    </div>
  );
};

export default LegalDisclaimer;