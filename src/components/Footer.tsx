import React from "react";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-purple-300/30 flex justify-around items-center h-16 z-20">
      <button 
        onClick={() => navigate('/home')}
        className="flex flex-col items-center hover:opacity-80 transition-opacity"
      >
        <img src="/home.png" alt="home" className="w-7 h-7 object-contain" />
      </button>
      <button
        onClick={() => navigate('/friends')}
        className="flex flex-col items-center hover:opacity-80 transition-opacity"
      >
        <img src="/discover-icon.png" alt="discover" className="w-7 h-7 object-contain" />
      </button>
      <button 
        onClick={() => navigate('/call-screen')}
        className="flex flex-col items-center justify-center hover:opacity-80 transition-opacity"
      >
        <img src="/logo.png" alt="logo" className="w-10 h-10 object-contain" style={{marginTop: '-2px'}} />
      </button>
      <button className="flex flex-col items-center"><img src="/icon_beru.png" alt="bell" className="w-7 h-7 object-contain" /></button>
      <button 
        onClick={() => navigate('/settings')}
        className="flex flex-col items-center hover:opacity-80 transition-opacity"
      >
        <img src="/icon-settings.png" alt="settings" className="w-7 h-7 object-contain" />
      </button>
    </nav>
  );
}

