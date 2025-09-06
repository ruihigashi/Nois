import React from 'react';

interface ChatHeaderProps {
  title: string;
  onBack: () => void;
  onCallClick?: () => void;
}

export default function ChatHeader({ title, onBack, onCallClick }: ChatHeaderProps) {
  return (
    <header className="flex items-center justify-between px-2 mt―6 p-2 border-b border-slate-200 overflow-visible relative z-10 max-w-full">
      <div className="flex items-center min-w-0 flex-1">
        <button 
          onClick={onBack} 
          className="flex items-center justify-center w-8 h-6 mr-3 hover:opacity-80 transition-opacity cursor-pointer flex-shrink-0"
        >
          <img src="/back-icon.png" alt="戻る" className="w-full h-full object-contain" />
        </button>
        <div className="home-font text-2xl font-extrabold pr-1 bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent drop-shadow-sm select-none truncate">
          {title}
        </div>
      </div>
      <div className="flex gap-2 items-center flex-shrink-0">
        {onCallClick && (
          <button 
            onClick={onCallClick}
            className="flex items-center justify-center w-8 h-8 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <img src="/call-icon.png" alt="通話" className="w-full h-full object-contain" />
          </button>
        )}
      </div>
    </header>
  );
}
