import React, { useState, useEffect } from 'react';
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { IncomingCall } from '../services/CallService';

interface IncomingCallModalProps {
  incomingCall: IncomingCall;
  onAccept: () => void;
  onReject: () => void;
}

export default function IncomingCallModal({ incomingCall, onAccept, onReject }: IncomingCallModalProps) {
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchCallerProfile = async () => {
      if (incomingCall && incomingCall.callerId) {
        try {
          const userDoc = await getDoc(doc(db, "users", incomingCall.callerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setProfileImageUrl(userData.profileImageUrl);
          }
        } catch (error) {
          console.error("Failed to fetch caller profile:", error);
        }
      }
    };
    fetchCallerProfile();
  }, [incomingCall]);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-sm w-full mx-4 border border-white/20">
        <div className="text-center">
          {/* プロフィール画像エリア */}
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center overflow-hidden">
            {profileImageUrl ? (
              <img src={profileImageUrl} alt={incomingCall.callerName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-2xl font-bold">
                {incomingCall.callerName.charAt(0)}
              </span>
            )}
          </div>

          {/* 発信者名 */}
          <div className='flex justify-center items-center h-10 w-full mb-10'>
            <h3 className="text-xl font-bold text-white mr-2">
              {incomingCall.callerName}
            </h3>

            <span className="text-white/80 text-sm ">
              からの着信
            </span>
          </div>

          {/* ボタンエリア */}
          <div className="flex gap-4">
            {/* 拒否ボタン */}
            <button
              onClick={onReject}
              className="flex-1 bg-red-500/80 hover:bg-red-500 text-white py-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* 応答ボタン */}
            <button
              onClick={onAccept}
              className="flex-1 bg-green-500/80 hover:bg-green-500 text-white py-4 rounded-full flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
