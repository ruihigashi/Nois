import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Header from "./Header";
import { useAuth } from "../contexts/AuthContext";
import { getFriendsList } from "../services/qrService";
import { useAutoCall } from "../hooks/useAutoCall";
import { hybridMessageService, Message } from "../services/HybridMessageService";
import Footer from './Footer';

export default function FriendList() {
  const navigate = useNavigate();
  const { currentUser: user } = useAuth();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastMessages, setLastMessages] = useState<Record<string, Message | null>>({});
  const [pc] = useState<RTCPeerConnection | null>(null);
  const localStreamRef = React.useRef<MediaStream | null>(null);

  // 自動通話機能
  const { startCall } = useAutoCall({
    userId: user?.uid || '',
    userName: user?.displayName || 'ユーザー',
    pc,
    localStreamRef,
    onCallConnected: () => {},
    onCallEnded: () => {}
  });

  useEffect(() => {
    const fetchFriends = async () => {
      if (user) {
        console.log('フレンドリスト取得開始, userId:', user.uid);
        
        try {
          // まずフレンドリストのみを取得
          const friendsList = await getFriendsList(user.uid);
          console.log('フレンドリスト取得成功:', friendsList);
          setFriends(friendsList);
          
          // メッセージ取得は後で非同期で実行（読み込みをブロックしない）
          if (friendsList.length > 0) {
            console.log('メッセージ取得開始（非同期）');
            const friendIds = friendsList.map(friend => friend.id);
            
            // メッセージ取得を非同期で実行
            hybridMessageService.getLastMessagesForUser(user.uid, friendIds)
              .then(lastMessages => {
                console.log('メッセージ取得成功:', lastMessages);
                setLastMessages(lastMessages);
              })
              .catch(error => {
                console.error('メッセージ取得エラー:', error);
                setLastMessages({});
              });
          } else {
            console.log('フレンドが0人');
          }
        } catch (error) {
          console.error('友達リスト取得エラー:', error);
          // エラーが発生しても読み込みを終了
          setFriends([]);
          setLastMessages({});
        } finally {
          console.log('読み込み完了');
          setLoading(false);
        }
      } else {
        console.log('ユーザーが未認証');
        setLoading(false);
      }
    };

    fetchFriends();
  }, [user]);

  const handlePlusClick = () => {
    navigate('/qr-scanner');
  };

  const handleCallFriend = async (friend: any) => {
    try {
      await startCall(friend.id, friend.displayName);
    } catch (error) {
      console.error('通話開始エラー:', error);
    }
  };

  const handleFriendClick = (friend: any) => {
    const params = new URLSearchParams({
      friendId: friend.id,
      friendName: friend.displayName,
      friendProfileImage: friend.profileImageUrl || ''
    });
    navigate(`/message?${params.toString()}`);
  };

    return (

      <div className="h-screen max-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-2 md:p-4 overflow-hidden relative">

        {/* ヘッダー */}

        <Header 

          headerTitle="Chat" 

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
                  {lastMessages[friend.id] ? (
                    <p className="text-white/60 text-sm truncate">
                      {lastMessages[friend.id]?.senderId === user?.uid ? 'あなた: ' : ''}
                      {lastMessages[friend.id]?.content}
                    </p>
                  ) : (
                    <p className="text-white/40 text-sm">メッセージがありません</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      

    </div>
  );
}
