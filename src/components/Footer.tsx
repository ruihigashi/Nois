import React from "react";

export default function Footer() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-purple-300/30 flex justify-around items-center h-16 z-20">
      <button className="flex flex-col items-center"><img src="/home.png" alt="home" className="w-7 h-7 object-contain" /></button>
      <button className="flex flex-col items-center"><img src="/discover-icon.png" alt="discover" className="w-7 h-7 object-contain" /></button>
      <div className="flex flex-col items-center justify-center">
        <img src="/logo.png" alt="logo" className="w-20 h-20 object-contain" style={{marginTop: '-2px'}} />
      </div>
      <button className="flex flex-col items-center"><img src="/icon_beru.png" alt="bell" className="w-7 h-7 object-contain" /></button>
      <button className="flex flex-col items-center"><img src="/icon-settings.png" alt="settings" className="w-7 h-7 object-contain" /></button>
    </nav>
  );
}

