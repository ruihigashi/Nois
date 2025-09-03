import React, { useRef } from "react";

interface MediaUIProps {
  // 音声関連
  remoteAudioRef: React.RefObject<HTMLAudioElement>;
  micMuted: boolean;
  speakerOn: boolean;
  showCamera: boolean;
  isInCall: boolean;
  callDuration: number;
  
  // 字幕関連
  captions: string[];
  sendText: string;
  sendingCaption: boolean;
  
  // 関数
  toggleMute: () => void;
  endCall: () => void;
  setShowCamera: (show: boolean) => void;
  setSpeakerOn: (on: boolean) => void;
  setSendText: (text: string) => void;
  sendCaption: () => void;
  formatCallDuration: (seconds: number) => string;
}

export default function MediaUI({
  remoteAudioRef,
  micMuted,
  speakerOn,
  showCamera,
  isInCall,
  callDuration,
  captions,
  sendText,
  sendingCaption,
  toggleMute,
  endCall,
  setShowCamera,
  setSpeakerOn,
  setSendText,
  sendCaption,
  formatCallDuration
}: MediaUIProps) {
  return (
    <div className="w-full lg:w-full flex-1 flex flex-col space-y-3">
      {/* カメラ表示エリア */}
      <div>
        {/* 上部のIndigo長方形 */}
        <div className="w-full h-8 bg-indigo-800 flex items-center px-4">
          {isInCall && (
            <div className="text-white text-sm font-medium">
              {formatCallDuration(callDuration)}
            </div>
          )}
        </div>
        
        {/* カメラ表示エリア */}
        <div className="w-full h-64 bg-gray-600 flex items-center justify-center relative">
          {!showCamera ? (
            <div className="text-center flex flex-col items-center justify-center">
              <img src="/notcamera.png" alt="camera off" className="w-16 h-16" />
              <div className="text-lg text-gray-600">Your camera is off.</div>
            </div>
          ) : (
            <div className="w-full h-full">
              {/* カメラがオンの場合は何も表示しない */}
            </div>
          )}
        </div>
        
        {/* 下部のIndigo長方形 */}
        <div className="w-full h-16 bg-indigo-800 flex items-center justify-around px-4">
          {/* Microphone */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => toggleMute()}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: micMuted ? '#dc2626' : '#1e1b4b'
              }}
            >
              <img 
                src={micMuted ? "/notmic-icon.png" : "/mic-icon.png"} 
                alt="microphone" 
                className="w-9 h-7 object-contain" 
              />
            </button>
            <span className="text-white text-[10px] mt-1 text-center leading-tight">Microphone</span>
          </div>
          
          {/* Camera */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowCamera(!showCamera)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
              style={{
                backgroundColor: showCamera ? '#dc2626' : '#1e1b4b'
              }}
            >
              <img 
                src={showCamera ? "/notcamera.png" : "/camera.png"} 
                alt="camera" 
                className="w-6 h-6 object-contain" 
              />
            </button>
            <span className="text-white text-[10px] mt-1 text-center leading-tight">Camera</span>
          </div>
          
          {/* End Call */}
          <div className="flex flex-col items-center">
            <button
              onClick={endCall}
              className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors cursor-pointer"
            >
              <img src="/phone-icon.png" alt="end call" className="w-10 h-10 object-contain" />
            </button>
          </div>
          
          {/* Talk */}
          <div className="flex flex-col items-center">
            <div className="w-7 h-7 bg-indigo-900 rounded-full flex items-center justify-center">
              <img src="/switch-icon.png" alt="switch camera" className="w-5 h-5 object-contain" />
            </div>
            <span className="text-white text-[10px] mt-1 text-center leading-tight">Switch Camera</span>
          </div>
          
          {/* Speaker */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setSpeakerOn(!speakerOn)}
              className="w-7 h-7 bg-indigo-900 rounded-full flex items-center justify-center transition-colors"
            >
              <img 
                src={speakerOn ? "/onspeaker.png" : "/offspeaker.png"} 
                alt="speaker" 
                className="w-8 h-5 object-contain" 
              />
            </button>
            <span className="text-white text-[10px] mt-1 text-center leading-tight">Speaker</span>
          </div>
        </div>
      </div>

      <div>
        <audio ref={remoteAudioRef} autoPlay playsInline className="w-full" />
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="h-64 overflow-auto border border-gray-300 p-3 bg-gray-50 mb-3">
          <div className="space-y-3">
            {captions.map((c,i) => {
              const isOwnMessage = c.startsWith("(you) ");
              const messageText = isOwnMessage ? c.replace("(you) ", "") : c;
              return (
                <div key={i} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs px-3 py-2 rounded-2xl ${
                    isOwnMessage 
                      ? 'bg-white text-gray-800 shadow-sm border border-gray-200' 
                      : 'bg-gray-800 text-white shadow-sm'
                  }`}>
                    <span className="text-sm">{messageText}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input 
            className={`border border-gray-300 px-2 py-2 bg-white rounded-full transition-all duration-300 ${sendText.trim() ? 'flex-1 min-w-0' : 'w-full'}`} 
            value={sendText} 
            onChange={(e)=>setSendText(e.target.value)} 
            onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); sendCaption(); }}} 
            placeholder="Enter your message..."
          />
          {sendText.trim() && (
            <button onClick={() => { console.log('Button clicked, sendText:', sendText); sendCaption(); }} disabled={sendingCaption}>
              {sendingCaption ? (
                <span className="text-gray-500 text-sm">...</span>
              ) : (
                <img src="/send-icon.png" alt="send" className="w-16 h-10 object-contain" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

