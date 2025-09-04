import React from "react";

interface HeaderProps {
  headerTitle: string;
  page: string;
  onBack?: () => void;
  onSettingsClick?: () => void;
}

export default function Header({ headerTitle, page, onBack, onSettingsClick }: HeaderProps) {
  return (
    <header className={`flex items-center justify-between border-b border-blue-300/30 bg-white/10 backdrop-blur-md w-full ${page==='call' ? '' : 'rounded-t-2xl'}`}>
      <div className="flex items-center">
        {onBack && (
          <button onClick={onBack} className="flex items-center justify-center w-10 h-12 hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/back-icon.png" alt="戻る" className="w-full h-full object-contain" />
          </button>
        )}
        <div className="home-font text-3xl font-extrabold pr-1 bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent drop-shadow-sm select-none" style={{letterSpacing:'-1px'}}>{headerTitle}</div>
      </div>
      <div className="flex gap-2 items-center">
        {page === 'call' && onSettingsClick && (
          <button onClick={() => onSettingsClick()} className="flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/icon-settings.png" alt="設定" className="w-full h-full object-contain" />
          </button>
        )}
      </div>
    </header>
  );
}

