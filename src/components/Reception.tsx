import React, { useRef, useState } from "react";

interface ReceptionProps {
  // WebRTC関連
  pc: RTCPeerConnection | null;
  remoteSDPRef: React.RefObject<HTMLTextAreaElement>;
  localStreamRef: React.RefObject<MediaStream | null>;
  
  // 状態管理
  micEnabled: boolean;
  micMuted: boolean;
  isInCall: boolean;
  answering: boolean;
  settingRemote: boolean;
  copiedLocal: boolean;
  showAnswererRemoteSDP: boolean;
  showAnswererLocalSDP: boolean;
  showConnectionUI: boolean;
  showMediaUI: boolean;
  answererLocalSDPValue: string;
  answererRemoteSDPInput: string;
  
  // 関数
  startMic: () => Promise<void>;
  stopMic: () => void;
  endCall: () => void;
  acceptOfferAndCreateAnswer: () => Promise<void>;
  setRemoteDescriptionManual: () => Promise<void>;
  showToast: (msg: string) => void;
  setAnswererRemoteSDPInput: (value: string) => void;
  
  // 設定
  forcedRole?: "caller" | "answerer";
}

export default function Reception({
  pc,
  remoteSDPRef,
  localStreamRef,
  micEnabled,
  micMuted,
  isInCall,
  answering,
  settingRemote,
  copiedLocal,
  showAnswererRemoteSDP,
  showAnswererLocalSDP,
  showConnectionUI,
  showMediaUI,
  answererLocalSDPValue,
  answererRemoteSDPInput,
  startMic,
  stopMic,
  endCall,
  acceptOfferAndCreateAnswer,
  setRemoteDescriptionManual,
  showToast,
  setAnswererRemoteSDPInput,
  forcedRole
}: ReceptionProps) {
  return (
    <div>
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
            {/* Answerer側のRemote SDP表示（段階的に表示） */}
            {showAnswererRemoteSDP && (
              <div>
                <h3 className="font-medium text-gray-700 mb-2 text-sm">Paste Pairing Code</h3>
                <textarea 
                  ref={remoteSDPRef} 
                  value={answererRemoteSDPInput}
                  onChange={(e) => setAnswererRemoteSDPInput(e.target.value)}
                  className="w-full h-16 border border-gray-300 p-2 text-sm font-mono bg-gray-50" 
                  placeholder="※Paste the pairing code here." 
                />
                {answererRemoteSDPInput.trim() && (
                  <div className="flex justify-center mt-2">
                    <button onClick={acceptOfferAndCreateAnswer} disabled={answering} className={"px-6 py-2 text-white text-lg font-medium border rounded min-w-32 " + (answering ? "bg-indigo-400 border-indigo-400 cursor-not-allowed" : "bg-indigo-600 border-indigo-600")}>
                      {answering ? "Answering..." : "Create"}
                    </button>
                  </div>
                )}
              
                {/* Answerer側のLocal SDP表示（Remote SDPの下に配置） */}
                {showAnswererLocalSDP && (
                  <div className="mt-4">
                    <h3 className="font-medium text-gray-700 mb-2 text-sm">Pairing Code</h3>
                    <div className="relative">
                      <textarea 
                        value={answererLocalSDPValue}
                        className="w-full h-16 border border-gray-300 p-2 text-sm font-mono bg-gray-50"  
                        readOnly 
                      />
                      <button
                        onClick={async ()=>{ try{ await navigator.clipboard.writeText(answererLocalSDPValue); showToast("Local SDP copied"); setTimeout(()=>{},1200);}catch{} }}
                        className={"absolute top-2 right-2 px-2 py-1 text-white text-sm border " + (copiedLocal ? "bg-green-600 border-green-600" : "bg-gray-600 border-gray-600")}
                      >{copiedLocal?"Copied!":"Copy"}</button>
                    </div>
                    <div className="flex justify-center mt-2">
                      <button onClick={setRemoteDescriptionManual} disabled={settingRemote} className={"px-6 py-2 text-white text-lg font-medium border rounded min-w-32 " + (settingRemote ? "bg-indigo-400 border-indigo-400 cursor-not-allowed" : "bg-indigo-600 border-indigo-600")}>
                        {settingRemote ? "Setting..." : "Start a call"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

