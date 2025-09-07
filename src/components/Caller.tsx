import React, { useRef, useState } from "react";

interface CallerProps {
  // WebRTC関連
  pc: RTCPeerConnection | null;
  localSDPRef: React.RefObject<HTMLTextAreaElement>;
  remoteSDPRef: React.RefObject<HTMLTextAreaElement>;
  localStreamRef: React.RefObject<MediaStream | null>;
  
  // 通話情報
  roomId?: string;
  friendName?: string;
  
  // 状態管理
  micEnabled: boolean;
  micMuted: boolean;
  isInCall: boolean;
  creatingOffer: boolean;
  settingRemote: boolean;
  copiedLocal: boolean;
  showLocalSDP: boolean;
  showRemoteSDP: boolean;
  showConnectionUI: boolean;
  showMediaUI: boolean;
  
  // 関数
  startMic: () => Promise<void>;
  stopMic: () => void;
  endCall: () => void;
  createOffer: () => Promise<void>;
  setRemoteDescriptionManual: () => Promise<void>;
  showToast: (msg: string) => void;
  
  // 設定
  forcedRole?: "caller" | "answerer";
}

export default function Caller({
  pc,
  localSDPRef,
  remoteSDPRef,
  localStreamRef,
  roomId,
  friendName,
  micEnabled,
  micMuted,
  isInCall,
  creatingOffer,
  settingRemote,
  copiedLocal,
  showLocalSDP,
  showRemoteSDP,
  showConnectionUI,
  showMediaUI,
  startMic,
  stopMic,
  endCall,
  createOffer,
  setRemoteDescriptionManual,
  showToast,
  forcedRole
}: CallerProps) {
  return (
    <div>
      {/* 発信中表示 */}
      {roomId && !isInCall && (
        <div className="text-center mb-4">
          <div className="text-white text-lg font-semibold mb-2">
            {friendName ? `${friendName}さんに発信中...` : '発信中...'}
          </div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        </div>
      )}
      
      <div className={`${micEnabled ? 'flex flex-wrap items-center gap-2' : 'flex justify-center'} mt-2 mb-3`}>
        <button onClick={micEnabled?stopMic:startMic} className={"px-3 py-2 text-white text-lg font-medium border rounded " + (micEnabled ? "bg-red-600 border-red-600" : "bg-blue-600 border-blue-600")}>
          {micEnabled ? "Call Stop" : "Call Start "}
        </button>
      </div>

      {micEnabled && (
        <>
          {isInCall && (
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <button onClick={endCall} className="px-3 py-2 text-white text-sm font-medium border rounded bg-red-700 border-red-700">
                通話終了
              </button>
              <div className="text-sm text-green-600 bg-green-50 px-2 py-1 border border-green-300 font-medium">
                🎤 通話中
              </div>
            </div>
          )}

          <div className="space-y-3">
            {/* Local SDP - Call側のみ段階的に表示 */}
            {showLocalSDP && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2 text-sm">Pairing Code</h3>
                <div className="relative">
                  <textarea 
                    ref={localSDPRef} 
                    className="w-full h-16 border border-gray-300 p-2 text-sm font-mono bg-gray-50" 
                    readOnly 
                    placeholder="Tap 'Create' to generate an authentication code and send it to the other person."
                  />
                  <button
                    onClick={async ()=>{ try{ await navigator.clipboard.writeText(localSDPRef.current?.value||""); showToast("Local SDP copied"); setTimeout(()=>{},1200);}catch{} }}
                    className={"absolute top-2 right-2 px-2 py-1 text-white text-sm border " + (copiedLocal ? "bg-green-600 border-green-600" : "bg-gray-600 border-gray-600")}
                  >{copiedLocal?"Copied!":"Copy"}</button>
                </div>
                <div className="flex justify-center mt-2">
                  <button onClick={createOffer} disabled={creatingOffer} className={"px-6 py-2 text-white text-lg font-medium border rounded min-w-32 " + (creatingOffer ? "bg-indigo-400 border-indigo-400 cursor-not-allowed" : "bg-indigo-600 border-indigo-600")}>
                    {creatingOffer ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}
            
            {/* Remote SDP - Call側のみ段階的に表示 */}
            {showRemoteSDP && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2 text-sm">Paste Pairing Code</h3>
                <textarea ref={remoteSDPRef} className="w-full h-16 border border-gray-300 p-2 text-sm font-mono bg-gray-50" placeholder="Paste the pairing code here." />
                <div className="flex justify-center mt-2">
                  <button onClick={setRemoteDescriptionManual} disabled={settingRemote} className={"px-6 py-2 text-white text-lg font-medium border rounded min-w-32 " + (settingRemote ? "bg-indigo-400 border-indigo-400 cursor-not-allowed" : "bg-indigo-600 border-indigo-600")}>
                    {settingRemote ? "Setting..." : "Start a call"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

