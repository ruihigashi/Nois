import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function Settings() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('ログアウトエラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-2 md:p-4 overflow-hidden relative">
      {/* ヘッダー */}
      <header className="flex items-center justify-between px-2 pt-2 pb-2 mb-6 border-b border-slate-200 overflow-visible relative z-10">
        <div className="flex items-center">
          <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
            設定
          </h1>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 bg-white/5 backdrop-blur-sm relative z-10 p-4 rounded-xl">
        <div className="space-y-6">



          {/* アプリ情報セクション */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">アプリ情報</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/80">バージョン</span>
                <span className="text-white">1.0.0</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/80">開発者</span>
                <span className="text-white">AIEL</span>
              </div>
            </div>
          </div>
        </div>

        {/* アカウントセクション */}
          <div className="space-y-3">
            <button
              onClick={handleLogout}
              className="w-full text-center bg-red-500/20 text-red-300 font-semibold py-3 px-4 rounded-lg hover:bg-red-500/30 transition-all duration-200"
            >
              ログアウト
            </button>
          </div>
      </main>

      {/* ナビゲーションバー（フッター） */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-blue-300/30 flex justify-around items-center h-16 z-20">
        <button
          onClick={() => navigate('/home')}
          className="flex flex-col items-center hover:opacity-80 transition-opacity"
        >
          <img src="/home.png" alt="home" className="w-7 h-7 object-contain" />
        </button>
        <button className="flex flex-col items-center"><img src="/discover-icon.png" alt="discover" className="w-7 h-7 object-contain" /></button>
        <button
          onClick={() => navigate('/caller')}
          className="flex flex-col items-center justify-center hover:opacity-80 transition-opacity"
        >
          <img src="/logo.png" alt="logo" className="w-10 h-10 object-contain" style={{ marginTop: '-2px' }} />
        </button>
        <button className="flex flex-col items-center"><img src="/icon_beru.png" alt="bell" className="w-7 h-7 object-contain" /></button>
        <button
          onClick={() => navigate('/settings')}
          className="flex flex-col items-center hover:opacity-80 transition-opacity"
        >
          <img src="/icon-settings.png" alt="settings" className="w-7 h-7 object-contain" />
        </button>
      </nav>
    </div>
  );
}
