import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../contexts/AuthContext";
import { getFriendsList } from "../services/qrService";

export default function FriendList() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFriends = async () => {
      if (user) {
        
        try {
          const friendsList = await getFriendsList(user.uid);
          setFriends(friendsList);
        } catch (error) {
          console.error('友達リスト取得エラー:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchFriends();
  }, [user]);

  const handlePlusClick = () => {
    navigate('/qr-scanner');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-2 md:p-4 overflow-hidden relative">
      {/* ヘッダー */}
      <Header 
        headerTitle="Friend List" 
        page="home" 
        onBack={() => navigate('/home')} 
        onSettingsClick={() => {}} 
        onPlusClick={handlePlusClick}
      />

      {/* メインコンテンツエリア */}
      <main className="flex-1 bg-white/5 backdrop-blur-sm relative z-10 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-white/80">読み込み中...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-white/80 mb-4">友達がいません</p>
            <p className="text-white/60 text-sm">+ボタンで友達を追加しましょう</p>
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map((friend) => (
              <div key={friend.id} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {friend.profileImageUrl ? (
                    <img 
                      src={friend.profileImageUrl} 
                      alt="プロフィール" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-gray-400 text-lg">👤</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold">{friend.displayName}</h3>
                  {friend.email && (
                    <p className="text-white/60 text-sm">{friend.email}</p>
                  )}
                </div>
                <button className="text-cyan-300 hover:text-cyan-200 transition-colors">
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M22 16.92V21a2 2 0 0 1-2.18 2A19.72 19.72 0 0 1 3 5.18 2 2 0 0 1 5 3h4.09a2 2 0 0 1 2 1.72c.13 1.13.37 2.23.72 3.28a2 2 0 0 1-.45 2.11l-1.27 1.27a16 16 0 0 0 6.29 6.29l1.27-1.27a2 2 0 0 1 2.11-.45c1.05.35 2.15.59 3.28.72A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
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
    </div>
  );
}
