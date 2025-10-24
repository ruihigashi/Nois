import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatHeader from './ChatHeader';
import CallConfirmModal from './CallConfirmModal';
import { useAuth } from '../contexts/AuthContext';
import { hybridMessageService, Message } from '../services/HybridMessageService';
import { hybridCallService } from '../services/HybridCallService';

export default function MessageScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser: user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // URLパラメータからフレンド情報を取得
  const friendId = new URLSearchParams(location.search).get('friendId');
  const friendName = new URLSearchParams(location.search).get('friendName');
  const friendProfileImage = new URLSearchParams(location.search).get('friendProfileImage');

  // メッセージを自動でスクロール
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // メッセージを取得
  useEffect(() => {
    if (!user || !friendId) return;

    // まず空の配列で表示を開始
    setMessages([]);
    setLoading(false);

    // リアルタイム監視を開始
    const unsubscribe = hybridMessageService.watchMessages(user.uid, friendId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => {
      unsubscribe();
    };
  }, [user, friendId]);

  // メッセージを送信
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !friendId || sending) return;

    console.log('メッセージ送信開始:', {
      senderId: user.uid,
      senderName: user.displayName,
      receiverId: friendId,
      content: newMessage.trim()
    });

    setSending(true);
    try {
      // ハイブリッドメッセージサービスで送信
      console.log('メッセージ送信開始...');
      const messageId = await hybridMessageService.sendMessage(
        user.uid,
        user.displayName || 'ユーザー',
        friendId,
        newMessage.trim()
      );
      console.log('メッセージ送信成功:', messageId);
      setNewMessage('');
    } catch (error) {
      console.error('メッセージ送信エラー:', error);
      const errorMessage = error instanceof Error ? error.message : 'メッセージの送信に失敗しました';
      alert(`${errorMessage}。もう一度お試しください。`);
    } finally {
      setSending(false);
    }
  };

  // Enterキーで送信
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 通話確認モーダルを表示
  const handleCallClick = () => {
    setShowCallConfirm(true);
  };

  // 通話を開始（確認後）
  const handleCallConfirm = async () => {
    if (!user || !friendId || !friendName) return;

    setShowCallConfirm(false);

    try {
      console.log('通話開始:', { callerId: user.uid, friendId, callerName: user.displayName, friendName });
      
      // 通話ルームを作成
      const roomId = await hybridCallService.createCallRoom(
        user.uid,
        friendId,
        user.displayName || 'ユーザー',
        friendName
      );
      
      console.log('通話ルーム作成完了:', roomId);
      
      // Call画面に遷移（friendNameも含める）
      const params = new URLSearchParams({
        roomId: roomId,
        friendName: friendName || 'ユーザー'
      });
      navigate(`/caller?${params.toString()}`);
    } catch (error) {
      console.error('通話開始エラー:', error);
    }
  };

  // 通話をキャンセル
  const handleCallCancel = () => {
    setShowCallConfirm(false);
  };

  // メッセージの時刻をフォーマット
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <p className="text-white/80">読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="h-screen max-h-screen w-screen max-w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex flex-col overflow-hidden fixed inset-0">
      {/* ヘッダー */}
      <div className="flex-shrink-0">
        <ChatHeader 
          title={friendName || 'メッセージ'} 
          onBack={() => navigate('/friends')} 
          onCallClick={handleCallClick} 
        />
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-3 min-h-0 max-h-full">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-end gap-2 ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
          >
            {/* 時刻表示（左側） */}
            <div className="text-xs text-white/60 mb-1 flex-shrink-0">
              {formatTime(message.timestamp)}
            </div>
            
            {/* メッセージバブル */}
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl break-words ${
                message.senderId === user?.uid
                  ? 'bg-blue-500 text-white'
                  : 'bg-white/20 text-white backdrop-blur-sm'
              }`}
            >
              <p className="text-sm">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ入力エリア */}
      <div className="flex-shrink-0 p-2 sm:p-3 bg-white/5 backdrop-blur-sm border-t border-white/10">
        <div className="flex gap-2 sm:gap-3 max-w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力..."
            className="flex-1 min-w-0 px-3 sm:px-4 py-2 sm:py-3 bg-white/20 border border-white/30 rounded-full text-white placeholder-white/60 focus:outline-none focus:ring-cyan-300 focus:border-transparent backdrop-blur-sm text-sm sm:text-base"
            disabled={sending}
          />
          {newMessage.trim() && (
            <button
              onClick={handleSendMessage}
              disabled={sending}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-full transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <img src="/send-icon.png" alt="送信" className="w-4 h-4 sm:w-5 sm:h-5 object-contain" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 通話確認モーダル */}
      {showCallConfirm && (
        <CallConfirmModal
          friendName={friendName || 'ユーザー'}
          onConfirm={handleCallConfirm}
          onCancel={handleCallCancel}
        />
      )}
    </div>
  );
}