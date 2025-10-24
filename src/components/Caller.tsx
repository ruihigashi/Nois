import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useWebRTC } from "../contexts/WebRTCContext";

export default function Caller() {
  const location = useLocation();
  const { isCallActive, micMuted, endCall, toggleMute } = useWebRTC();

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const friendId = queryParams.get('friendId');
  const friendName = queryParams.get('friendName');

  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchFriendProfile = async () => {
      if (friendId) {
        try {
          const userDoc = await getDoc(doc(db, "users", friendId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfileImageUrl(userData.profileImageUrl);
          }
        } catch (error) {
          console.error("Failed to fetch friend profile:", error);
        }
      }
    };
    fetchFriendProfile();
  }, [friendId]);

  return (
    <div className="fixed inset-0 w-full h-full flex flex-col items-center justify-center text-white p-4 bg-black z-50">
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-32 h-32 rounded-full bg-gray-600 mb-6 overflow-hidden flex items-center justify-center">
          {profileImageUrl ? (
            <img src={profileImageUrl} alt={friendName ?? "Friend"} className="w-full h-full object-cover" />
          ) : (
            <span className="text-5xl text-gray-400">👤</span>
          )}
        </div>
        <h2 className="text-3xl font-bold mb-2">{friendName || 'Unknown'}</h2>
        <p className="text-lg text-white/70">
          {isCallActive ? '通話中' : '発信中...'}
        </p>
      </div>

      {/* コントロールボタン */}
      <div className="flex items-center gap-6 p-4">
        <button onClick={toggleMute} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${micMuted ? 'bg-white/50' : 'bg-white/20'}`}>
          <img src={micMuted ? '/notmic-icon.png' : '/mic-icon.png'} alt="Mute" className="w-8 h-8" />
        </button>
        <button onClick={() => endCall(true)} className="w-20 h-20 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 transition-all">
          <img src="/phone-icon.png" alt="End Call" className="w-10 h-10 transform -rotate-45" />
        </button>
        {/* スピーカーボタンは後で実装 */}
        <div className="w-16 h-16"></div>
      </div>
    </div>
  );
}
