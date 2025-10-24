import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useAutoCall as useAutoCallHook, IncomingCall } from '../hooks/useAutoCall';

const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

interface WebRTCContextType {
  pc: RTCPeerConnection | null;
  localStreamRef: React.RefObject<MediaStream | null>;
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  micEnabled: boolean;
  startMic: () => Promise<void>;
  stopMic: () => void;
  incomingCall: IncomingCall | null;
  answerCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  startCall: (friendId: string, friendName: string) => Promise<void>;
  endCall: (updateDb?: boolean) => Promise<void>;
  isCallActive: boolean;
}

const WebRTCContext = createContext<WebRTCContextType | undefined>(undefined);

export function useWebRTC() {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
}

export function WebRTCProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [micEnabled, setMicEnabled] = useState(false);

  useEffect(() => {
    const newPc = new RTCPeerConnection({ iceServers });
    setPc(newPc);

    newPc.ontrack = (event) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    return () => {
      newPc.close();
    };
  }, []);

  const startMic = async () => {
    if (!pc) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      setMicEnabled(true);
    } catch (error) {
      console.error("Error starting mic:", error);
    }
  };

  const stopMic = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setMicEnabled(false);
  };

  const { 
    incomingCall, 
    isCallActive, 
    answerCall, 
    rejectCall, 
    startCall, 
    endCall 
  } = useAutoCallHook({
    userId: user?.uid || '',
    userName: user?.displayName || 'ユーザー',
    pc,
    localStreamRef,
    onCallConnected: () => { console.log('Call connected'); },
    onCallEnded: () => { console.log('Call ended'); },
  });

  const value = {
    pc,
    localStreamRef,
    remoteAudioRef,
    micEnabled,
    startMic,
    stopMic,
    incomingCall,
    answerCall,
    rejectCall,
    startCall,
    endCall,
    isCallActive,
  };

  return (
    <WebRTCContext.Provider value={value}>
      {children}
    </WebRTCContext.Provider>
  );
}
