import React from "react";

interface HeaderProps {
  headerTitle: string;
  page: string;
  onBack?: () => void;
  onSettingsClick?: () => void;
  onPlusClick?: () => void;
}

export default function Header({ headerTitle, page, onBack, onSettingsClick, onPlusClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-2 mb-6 pb-2 border-b border-slate-200 overflow-visible relative z-10 -mx-2">
      <div className="flex items-center">
        {onBack && (
          <button onClick={onBack} className="flex items-center justify-center w-8 h-6 mr-2 hover:opacity-80 transition-opacity cursor-pointer">
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
        {page === 'home' && onPlusClick && (
          <button onClick={() => onPlusClick()} className="flex items-center justify-center w-6 h-6 hover:opacity-80 transition-opacity cursor-pointer">
            <img src="/plus-icon.png" alt="友達追加" className="w-full h-full object-contain" />
          </button>
        )}
      </div>
    </header>
  );
}

