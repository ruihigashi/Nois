import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../contexts/AuthContext";
import { getFriendsList } from "../services/qrService";
import CallConfirmModal from "./CallConfirmModal";
import { hybridCallService } from "../services/HybridCallService";
import Footer from './Footer';

export default function CallScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showCallConfirm, setShowCallConfirm] = useState(false);

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

  const handleFriendClick = (friend: any) => {
    setSelectedFriend(friend);
    setShowCallConfirm(true);
  };

  const handleCallConfirm = async () => {
    if (!user || !selectedFriend) return;

    setShowCallConfirm(false);

    try {
      const roomId = await hybridCallService.createCallRoom(
        user.uid,
        selectedFriend.id,
        user.displayName || 'ユーザー',
        selectedFriend.displayName
      );
      
      const params = new URLSearchParams({
        roomId: roomId,
        friendName: selectedFriend.displayName || 'ユーザー'
      });
      navigate(`/caller?${params.toString()}`);
    } catch (error) {
      console.error('通話開始エラー:', error);
    }
  };

  const handleCallCancel = () => {
    setShowCallConfirm(false);
    setSelectedFriend(null);
  };

  return (
    <div className="h-screen max-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-2 md:p-4 overflow-hidden relative">
      <Header 
        headerTitle="Call"
        page="call"
        onBack={() => navigate('/home')} 
        onSettingsClick={() => {}} 
        onPlusClick={handlePlusClick}
      />

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
              <div 
                key={friend.id} 
                onClick={() => handleFriendClick(friend)}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center space-x-3 cursor-pointer hover:bg-white/15 transition-all duration-200"
              >
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
                  <p className="text-white/60 text-sm">Tap to call</p>
                </div>
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src="/call-icon.png" alt="Call" className="w-6 h-6 opacity-50" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <Footer />

      {showCallConfirm && selectedFriend && (
        <CallConfirmModal
          friendName={selectedFriend.displayName}
          onConfirm={handleCallConfirm}
          onCancel={handleCallCancel}
        />
      )}
    </div>
  );
}
