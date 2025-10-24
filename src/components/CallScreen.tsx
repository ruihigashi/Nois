import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { getFriendsList } from "../services/qrService";
import { Lang, Translator } from "../translate";
import CallConfirmModal from "./CallConfirmModal";
import Header from "./Header";

import { useWebRTC } from "../contexts/WebRTCContext";

export default function CallScreen() {
  const navigate = useNavigate();
  const { currentUser: user } = useAuth();
  const { startCall, startMic, endCall } = useWebRTC();
  const [friends, setFriends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Translation / TTS
  const [fromLang, setFromLang] = useState<Lang>("auto");
  const [toLang, setToLang] = useState<Lang>("auto");
  const [ttsLang, setTtsLang] = useState<"auto"|"ja"|"en">("auto");
  const [ttsVoiceName, setTtsVoiceName] = useState<string>("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // TTS voices init
  useEffect(() => {
    function loadVoices(){
      voicesRef.current = window.speechSynthesis.getVoices();
      if (!ttsVoiceName && voicesRef.current.length) {
        const ja = voicesRef.current.find(v => v.lang.toLowerCase().startsWith("ja"));
        const en = voicesRef.current.find(v => v.lang.toLowerCase().startsWith("en"));
        setTtsVoiceName((ja || en || voicesRef.current[0]).name);
      }
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [ttsVoiceName]);

  function speak(text: string) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      const chooseLang = ttsLang === "auto" ? (/[\u3040-\u30ff\u3400-\u9fff]/.test(text) ? "ja" : "en") : ttsLang;
      u.lang = chooseLang === "ja" ? "ja-JP" : "en-US";
      const voices = voicesRef.current;
      const preferred = voices.find(v => v.name === ttsVoiceName) || voices.find(v => v.lang.toLowerCase().startsWith(u.lang.toLowerCase())) || voices[0];
      if (preferred) u.voice = preferred;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch {}
  }

  const voices = voicesRef.current;
  const voiceOptions = useMemo(() => voices.map(v => ({ name: v.name, lang: v.lang })), [voices]);

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
      await startMic();
      await startCall(selectedFriend.id, selectedFriend.displayName);
    } catch (error) {
      console.error("Failed to start call:", error);
      endCall(); // エラー時にクリーンアップ処理を呼ぶ
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

          onSettingsClick={() => setShowSettings(true)} 

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
                </div>
                <div className="w-10 h-10 flex items-center justify-center">
                  <img src="/call-icon.png" alt="Call" className="w-6 h-6 opacity-50" />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      


      {showCallConfirm && selectedFriend && (
        <CallConfirmModal
          friendName={selectedFriend.displayName}
          onConfirm={handleCallConfirm}
          onCancel={handleCallCancel}
        />
      )}

      {showSettings && (
        <div className="absolute inset-0 bg-black/60 z-30 flex items-center justify-center" onClick={() => setShowSettings(false)}>
          <div className="bg-slate-800/90 backdrop-blur-xl border border-white/20 rounded-2xl p-4 md:p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                  通話設定
                </h2>
              </div>

              {/* 翻訳設定セクション */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                  </svg>
                  翻訳設定
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">送信言語</label>
                    <select 
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent transition-all backdrop-blur-sm" 
                      value={fromLang} 
                      onChange={(e)=>setFromLang(e.target.value as Lang)}
                    >
                      <option value="auto" className="bg-gray-800 text-white">自動検出</option>
                      <option value="ja" className="bg-gray-800 text-white">日本語</option>
                      <option value="en" className="bg-gray-800 text-white">英語</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">翻訳先言語</label>
                    <select 
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent transition-all backdrop-blur-sm" 
                      value={toLang} 
                      onChange={(e)=>setToLang(e.target.value as Lang)}
                    >
                      <option value="auto" className="bg-gray-800 text-white">自動選択</option>
                      <option value="ja" className="bg-gray-800 text-white">日本語</option>
                      <option value="en" className="bg-gray-800 text-white">英語</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 音声設定セクション */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                  </svg>
                  音声設定
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">読み上げ言語</label>
                    <select 
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent transition-all backdrop-blur-sm" 
                      value={ttsLang} 
                      onChange={(e)=>setTtsLang(e.target.value as any)}
                    >
                      <option value="auto" className="bg-gray-800 text-white">自動選択</option>
                      <option value="ja" className="bg-gray-800 text-white">日本語</option>
                      <option value="en" className="bg-gray-800 text-white">英語</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">音声エンジン</label>
                    <select 
                      className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-transparent transition-all backdrop-blur-sm" 
                      value={ttsVoiceName} 
                      onChange={(e)=>setTtsVoiceName(e.target.value)}
                    >
                      {voiceOptions.map(v => (
                        <option key={v.name} value={v.name} className="bg-gray-800 text-white">
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-center">
                    <button 
                      onClick={()=>{ 
                        const sample = ttsLang==="ja"?"テスト。こんにちは。":"Test: Hello there."; 
                        speak(sample); 
                      }} 
                      className="px-6 py-2 mt-2 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white text-sm font-medium rounded-lg hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <img src="/offspeaker.png" alt="speaker" className="w-6 h-6 object-contain" />
                      音声テスト
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-8 py-3 bg-gradient-to-r from-slate-600 to-gray-700 text-white font-medium rounded-xl hover:from-slate-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  設定を閉じる
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
