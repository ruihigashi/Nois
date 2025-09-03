import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";

export default function FriendList() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white p-2 md:p-4 overflow-hidden relative">
      {/* ヘッダー */}
      <Header 
        headerTitle="Friend List" 
        page="home" 
        onBack={() => navigate('/')} 
        onSettingsClick={() => {}} 
      />

      {/* メインコンテンツエリア（真っ白） */}
      <main className="flex-1 bg-white relative z-10">
        {/* ここに新しいコンテンツを追加できます */}
      </main>
      
      {/* ナビゲーションバー（フッター） */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around items-center h-16 z-20">
        <button className="flex flex-col items-center"><img src="/home.png" alt="home" className="w-7 h-7 object-contain" /></button>
        <button className="flex flex-col items-center"><img src="/discover-icon.png" alt="discover" className="w-7 h-7 object-contain" /></button>
        <div className="flex flex-col items-center justify-center">
          <img src="/logo.png" alt="logo" className="w-10 h-10 object-contain" style={{marginTop: '-2px'}} />
        </div>
        <button className="flex flex-col items-center"><img src="/icon_beru.png" alt="bell" className="w-7 h-7 object-contain" /></button>
        <button className="flex flex-col items-center"><img src="/icon-settings.png" alt="settings" className="w-7 h-7 object-contain" /></button>
      </nav>
    </div>
  );
}
