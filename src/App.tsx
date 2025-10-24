import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Lang, Translator, translate } from "./translate";
import Caller from "./components/Caller";
import MediaUI from "./components/MediaUI";
import Header from "./components/Header";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useWebRTC } from "./contexts/WebRTCContext";

type Role = "caller" | "answerer";

interface AppProps {
  forcedRole?: Role;
}

type Tab = "call" | "settings";

export default function App({ forcedRole }: AppProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser: user } = useAuth();

  const {
    pc,
    localStreamRef,
    remoteAudioRef,
    micEnabled,
    startMic,
    stopMic,
    endCall,
    isCallActive,
  } = useWebRTC();

  const [tab, setTab] = useState<Tab>("call");
  const [role, setRole] = useState<Role>(forcedRole ?? "caller");
  const [toast, setToast] = useState<string>("");
  const [showMediaUI, setShowMediaUI] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [captions, setCaptions] = useState<string[]>([]);
  const [sendText, setSendText] = useState("");
  const [sendingCaption, setSendingCaption] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const dcQueueRef = useRef<string[]>([]);

  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const roomId = queryParams.get('roomId');
  const friendId = queryParams.get('friendId');
  const friendName = queryParams.get('friendName');

  const [fromLang, setFromLang] = useState<Lang>("auto");
  const [toLang, setToLang] = useState<Lang>("auto");
  const [translator, setTranslator] = useState<Translator>("mini-dict");
  const [ttsLang, setTtsLang] = useState<"auto" | "ja" | "en">("auto");
  const [ttsVoiceName, setTtsVoiceName] = useState<string>("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  const wireDataChannel = useCallback((ch: RTCDataChannel) => {
    setDataChannel(ch);
    ch.onopen = () => {
      const q = dcQueueRef.current;
      while (q.length) {
        const txt = q.shift()!;
        try { ch.send(JSON.stringify({ type: "caption", text: txt })); } catch {}
      }
    };
    ch.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "caption") {
          setCaptions((old) => [...old.slice(-50), msg.text]);
        }
      } catch {}
    };
  }, []);

  useEffect(() => {
    if (isCallActive) {
      setShowMediaUI(true);
    } else {
      setShowMediaUI(false);
    }
  }, [isCallActive]);

  useEffect(() => {
    if (pc) {
      pc.ondatachannel = (ev) => wireDataChannel(ev.channel);
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          endCall();
        }
      };
    }
  }, [pc, endCall, wireDataChannel]);

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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive]);

  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(""), 1500); }
  
  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const to = !micMuted;
    stream.getAudioTracks().forEach(track => {
      track.enabled = !to;
    });
    setMicMuted(to);
  }

  async function sendCaption() {
    if (!dataChannel || dataChannel.readyState !== "open") return;
    if (sendingCaption) return;
    setSendingCaption(true);
    let text = sendText.trim(); 
    if (!text) { 
      setSendingCaption(false); 
      return; 
    }
    setSendText("");
    const outText = await translate(text, fromLang, toLang, translator);
    dataChannel.send(JSON.stringify({ type: "caption", text: outText }));
    setCaptions((old) => [...old.slice(-50), "(you) " + outText]);
    setSendingCaption(false);
  }

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

  const headerTitle = role === 'caller' ? 'Call' : 'Reception';

  const isCalling = forcedRole === 'caller' && !isCallActive;

  const containerClass = isCalling
    ? "h-screen max-h-screen bg-black overflow-hidden relative"
    : "h-screen max-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 p-2 md:p-4 overflow-hidden relative";

  return (
    <div className={containerClass}>
      <div className={`h-full flex flex-col relative z-10`}>
        {toast && <div className="fixed top-4 right-4 z-50 rounded-xl bg-black/90 text-white px-4 py-2 text-base shadow-2xl font-semibold tracking-wide animate-fadein">{toast}</div>}

        {isCalling ? null : (
          <Header 
            headerTitle={headerTitle}
            page="call"
            onBack={() => navigate('/home')}
            onSettingsClick={() => setTab("settings")}
          />
        )}

        {tab === "call" ? (
          <div className={`flex-1 flex flex-col lg:flex-row overflow-hidden ${isCalling ? '' : 'bg-white/5 backdrop-blur-sm pb-24'}`}>
            {!showMediaUI ? (
              <div className="w-full h-full p-4">
                  <Caller />
              </div>
            ) : (
              <div className="w-full flex-1 flex flex-col space-y-3 p-4">
                <MediaUI
                  remoteAudioRef={remoteAudioRef}
                  micMuted={micMuted}
                  speakerOn={speakerOn}
                  showCamera={showCamera}
                  isInCall={isCallActive}
                  callDuration={callDuration}
                  captions={captions}
                  sendText={sendText}
                  sendingCaption={sendingCaption}
                  toggleMute={toggleMute}
                  endCall={endCall}
                  setShowCamera={setShowCamera}
                  setSpeakerOn={setSpeakerOn}
                  setSendText={setSendText}
                  sendCaption={sendCaption}
                  formatCallDuration={formatCallDuration}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 bg-white/5 backdrop-blur-sm relative z-10 p-4 rounded-xl">
            <div className="space-y-6">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">通話設定</h2>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">翻訳設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-white/60 mb-1">送信言語</label>
                    <select className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white" value={fromLang} onChange={(e)=>setFromLang(e.target.value as Lang)}>
                      <option value="auto" className="bg-gray-800">自動検出</option>
                      <option value="ja" className="bg-gray-800">日本語</option>
                      <option value="en" className="bg-gray-800">英語</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-white/60 mb-1">翻訳先言語</label>
                    <select className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white" value={toLang} onChange={(e)=>setToLang(e.target.value as Lang)}>
                      <option value="auto" className="bg-gray-800">自動選択</option>
                      <option value="ja" className="bg-gray-800">日本語</option>
                      <option value="en" className="bg-gray-800">英語</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">音声設定</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">読み上げ言語</label>
                    <select className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white" value={ttsLang} onChange={(e)=>setTtsLang(e.target.value as any)}>
                      <option value="auto" className="bg-gray-800">自動選択</option>
                      <option value="ja" className="bg-gray-800">日本語</option>
                      <option value="en" className="bg-gray-800">英語</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">音声エンジン</label>
                    <select className="w-full px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-sm text-white" value={ttsVoiceName} onChange={(e)=>setTtsVoiceName(e.target.value)}>
                      {voiceOptions.map(v => (<option key={v.name} value={v.name} className="bg-gray-800">{v.name} ({v.lang})</option>))}
                    </select>
                  </div>
                  <div className="flex justify-center">
                    <button onClick={()=>{ const sample = ttsLang==="ja"?"テスト。こんにちは。":"Test: Hello there."; speak(sample); }} className="px-6 py-2 mt-2 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white text-sm font-medium rounded-lg">
                      音声テスト
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex justify-center pt-2">
                <button onClick={() => setTab("call")} className="px-8 py-3 bg-gradient-to-r from-slate-600 to-gray-700 text-white font-medium rounded-xl">
                  設定を閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}