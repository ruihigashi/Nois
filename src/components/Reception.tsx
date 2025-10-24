import React from "react";

interface ReceptionProps {
  pc: RTCPeerConnection | null;
  localStreamRef: React.RefObject<MediaStream | null>;
  micEnabled: boolean;
  isInCall: boolean;
  startMic: () => Promise<void>;
  stopMic: () => void;
  endCall: (updateDb?: boolean) => void;
  forcedRole?: "caller" | "answerer";
}

export default function Reception({
  pc,
  localStreamRef,
  micEnabled,
  isInCall,
  startMic,
  stopMic,
  endCall,
  forcedRole
}: ReceptionProps) {
  return (
    <div>
      {/* 接続中の表示 */}
      {!isInCall && (
        <div className="text-center mb-4 p-4 bg-white/10 rounded-lg">
          <div className="text-white text-lg font-semibold mb-2">
            接続中...
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      )}
    </div>
  );
}
