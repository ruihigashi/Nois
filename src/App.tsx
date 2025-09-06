import React, { useEffect, useMemo, useRef, useState } from "react";
import { Lang, Translator, detect, translate } from "./translate";
import Home from "./Home";
import FriendList from "./components/FriendList";
import Caller from "./components/Caller";
import Reception from "./components/Reception";
import MediaUI from "./components/MediaUI";
import Header from "./components/Header";
import Footer from "./components/Footer";
import IncomingCallModal from "./components/IncomingCallModal";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { useAutoCall } from "./hooks/useAutoCall";

type Role = "caller" | "answerer";

interface AppProps {
  forcedRole?: Role;
}
const iceServers: RTCIceServer[] = [{ urls: "stun:stun.l.google.com:19302" }];

type Tab = "call" | "settings";

export default function App({ forcedRole }: AppProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [page, setPage] = useState<'home'|'call'>('home');
  const [tab, setTab] = useState<Tab>("call");
  const [pc, setPc] = useState<RTCPeerConnection | null>(null);
  const [role, setRole] = useState<Role>(forcedRole ?? "caller");
  const localSDPRef = useRef<HTMLTextAreaElement>(null);
  const remoteSDPRef = useRef<HTMLTextAreaElement>(null);
  const [dataChannel, setDataChannel] = useState<RTCDataChannel | null>(null);
  const [dcState, setDcState] = useState<"closed"|"connecting"|"open">("closed");
  const dcQueueRef = useRef<string[]>([]);

  const [captions, setCaptions] = useState<string[]>([]);
  const [sendText, setSendText] = useState("");

  // Audio
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(false);

  // States / UX
  const [toast, setToast] = useState<string>("");
  const [creatingOffer, setCreatingOffer] = useState(false);
  const [answering, setAnswering] = useState(false);
  const [settingRemote, setSettingRemote] = useState(false);
  const [sendingCaption, setSendingCaption] = useState(false);
  const [copiedLocal, setCopiedLocal] = useState(false);
  const [connState, setConnState] = useState<RTCPeerConnectionState | "new">("new");
  const [iceState, setIceState] = useState<RTCIceConnectionState | "new">("new");
  const [isInCall, setIsInCall] = useState(false);
  // UI: 通話接続後に音声/字幕を表示するか（認証コード交換完了後に表示）
  const [showMediaUI, setShowMediaUI] = useState<boolean>(false);
  // UI: 接続設定を表示するか。Set Remote Description後は非表示にする（ただし機能は隠すだけ）
  const [showConnectionUI, setShowConnectionUI] = useState<boolean>(true);
  // UI: Call側の段階的表示制御
  const [showLocalSDP, setShowLocalSDP] = useState<boolean>(false);
  const [showRemoteSDP, setShowRemoteSDP] = useState<boolean>(false);
  // UI: Answerer側の段階的表示制御
  const [showAnswererRemoteSDP, setShowAnswererRemoteSDP] = useState<boolean>(false);
  const [showAnswererLocalSDP, setShowAnswererLocalSDP] = useState<boolean>(false);
  // Answerer側のLocal SDP値保存用
  const [answererLocalSDPValue, setAnswererLocalSDPValue] = useState<string>("");
  // Answerer側のRemote SDP入力値監視用
  const [answererRemoteSDPInput, setAnswererRemoteSDPInput] = useState<string>("");
  // カメラ表示の状態管理
  const [showCamera, setShowCamera] = useState<boolean>(false);
  // 通話時間管理
  const [callDuration, setCallDuration] = useState<number>(0);
  // FriendList画面の表示状態
  const [showFriendList, setShowFriendList] = useState<boolean>(false);

  // 自動通話機能
  const { incomingCall, answerCall, rejectCall } = useAutoCall({
    userId: user?.uid || '',
    userName: user?.displayName || 'ユーザー',
    pc,
    localStreamRef,
    onCallConnected: () => {
      setIsInCall(true);
      setShowMediaUI(true);
      setShowConnectionUI(false);
      showToast("通話が接続されました");
    },
    onCallEnded: () => {
      setIsInCall(false);
      setShowMediaUI(false);
      setShowConnectionUI(true);
      showToast("通話が終了されました");
    }
  });

  // Translation / TTS
  const [fromLang, setFromLang] = useState<Lang>("auto");
  const [toLang, setToLang] = useState<Lang>("auto");
  const [translator, setTranslator] = useState<Translator>("mini-dict");
  const [speakOnReceive, setSpeakOnReceive] = useState(true);
  const [ttsLang, setTtsLang] = useState<"auto"|"ja"|"en">("auto");
  const [ttsVoiceName, setTtsVoiceName] = useState<string>("");
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    const p = new RTCPeerConnection({ iceServers });
    setPc(p);
    p.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      setIsInCall(true);
      showToast("相手の音声を受信しました");
    };
    p.onconnectionstatechange = () => {
      const newState = p.connectionState;
      setConnState(newState);
      if (newState === "connected") {
        setIsInCall(true);
        setShowMediaUI(true);
        setShowConnectionUI(false);
        showToast("音声通話が接続されました");
      } else if (newState === "disconnected" || newState === "failed" || newState === "closed") {
        setIsInCall(false);
        showToast("音声通話が切断されました");
      }
    };
    p.oniceconnectionstatechange = () => {
      const newState = p.iceConnectionState;
      setIceState(newState);
      if (newState === "connected") {
        showToast("ICE接続が確立されました");
      } else if (newState === "failed" || newState === "disconnected") {
        showToast("ICE接続に問題が発生しました");
      }
    };
    p.ondatachannel = (ev) => wireDataChannel(ev.channel);
    return () => { p.close(); };
  }, []);

  // TTS voices init
  useEffect(() => {
    function loadVoices(){
      voicesRef.current = window.speechSynthesis.getVoices();
      if (!ttsVoiceName && voicesRef.current.length) {
        // pick Japanese if exists else first
        const ja = voicesRef.current.find(v => v.lang.toLowerCase().startsWith("ja"));
        const en = voicesRef.current.find(v => v.lang.toLowerCase().startsWith("en"));
        setTtsVoiceName((ja || en || voicesRef.current[0]).name);
      }
    }
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [ttsVoiceName]);

  // 通話時間の更新
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInCall) {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isInCall]);

  // 通話時間をフォーマットする関数
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  function showToast(msg: string) { setToast(msg); setTimeout(()=>setToast(""), 1500); }

  function wireDataChannel(ch: RTCDataChannel) {
    setDataChannel(ch);
    setDcState(ch.readyState === "open" ? "open" : "connecting");
    ch.onopen = () => {
      setDcState("open");
      const q = dcQueueRef.current;
      while (q.length) {
        const txt = q.shift()!;
        try { ch.send(JSON.stringify({ type: "caption", text: txt })); } catch {}
      }
      showToast("DataChannel open");
    };
    ch.onclose = () => { setDcState("closed"); showToast("DataChannel closed"); };
    ch.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "caption") {
          setCaptions((old) => [...old.slice(-50), msg.text]);
          if (speakOnReceive) speak(msg.text);
        } else if (msg.type === "show_media_ui") {
          // 相手からの通知でメディアUIを表示し、接続設定を隠す
          setShowMediaUI(true);
          setShowConnectionUI(false);
          showToast("相手が通話を開始しました");
        }
      } catch {}
    };
  }

  // Media
  async function startMic() {
    if (!pc) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      localStreamRef.current = stream;
      
      // 既存のオーディオトラックを削除
      for (const sender of pc.getSenders()) {
        if (sender.track && sender.track.kind === "audio") {
          pc.removeTrack(sender);
        }
      }
      
      // 新しいオーディオトラックを追加
      stream.getAudioTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
      
      setMicEnabled(true); 
      setMicMuted(false);
      
      // Call側の場合、Local SDPを表示
      if (role === "caller") {
        setShowLocalSDP(true);
      }
      // Answerer側の場合、Remote SDPを表示
      if (role === "answerer") {
        setShowAnswererRemoteSDP(true);
      }
      
      showToast("マイクが開始されました");
      
      // 音声トラックを追加した後、接続が確立されている場合は再ネゴシエーションが必要
      if (pc.connectionState === "connected" || pc.connectionState === "connecting") {
        showToast("音声トラックが追加されました。必要に応じてSDPを再交換してください。");
      }
    } catch (error) {
      console.error("マイクの開始に失敗しました:", error);
      showToast("マイクの開始に失敗しました");
    }
  }
  
  function stopMic() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // オーディオトラックを削除
    if (pc) {
      for (const sender of pc.getSenders()) {
        if (sender.track && sender.track.kind === "audio") {
          pc.removeTrack(sender);
        }
      }
    }
    
    setMicEnabled(false); 
    setMicMuted(false);
    showToast("マイクが停止されました");
  }

  function endCall() {
    if (pc) {
      pc.close();
      setPc(null);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setMicEnabled(false);
    setMicMuted(false);
    setIsInCall(false);
    setConnState("new");
    setIceState("new");
    setDcState("closed");
    setDataChannel(null);
    setShowMediaUI(false);
    setShowConnectionUI(true);
    showToast("通話が終了されました");
    
    // ホーム画面に戻る
    navigate('/home');
  }

  function createNewConnection() {
    endCall();
    const p = new RTCPeerConnection({ iceServers });
    setPc(p);
    p.ontrack = (ev) => {
      const [stream] = ev.streams;
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = stream;
      setIsInCall(true);
      showToast("相手の音声を受信しました");
    };
    p.onconnectionstatechange = () => {
      const newState = p.connectionState;
      setConnState(newState);
      if (newState === "connected") {
        setIsInCall(true);
        setShowMediaUI(true);
        setShowConnectionUI(false);
        showToast("音声通話が接続されました");
      } else if (newState === "disconnected" || newState === "failed" || newState === "closed") {
        setIsInCall(false);
        showToast("音声通話が切断されました");
      }
    };
    p.oniceconnectionstatechange = () => {
      const newState = p.iceConnectionState;
      setIceState(newState);
      if (newState === "connected") {
        showToast("ICE接続が確立されました");
      } else if (newState === "failed" || newState === "disconnected") {
        showToast("ICE接続に問題が発生しました");
      }
    };
    p.ondatachannel = (ev) => wireDataChannel(ev.channel);
    
    // 既存のローカルストリームがある場合は、新しい接続にも追加
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        p.addTrack(track, localStreamRef.current!);
      });
      showToast("既存の音声トラックが新しい接続に追加されました");
    }
    
    showToast("新しい接続が作成されました");
  }
  
  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    
    const to = !micMuted;
    stream.getAudioTracks().forEach(track => {
      track.enabled = !to;
    });
    setMicMuted(to);
    showToast(to ? "マイクがミュートされました" : "マイクのミュートが解除されました");
  }

  // Manual signaling
  async function createOffer() {
    if (!pc) return;
    setCreatingOffer(true);
    try {
      // 音声トラックが追加されているか確認
      if (!localStreamRef.current) {
        showToast("先にマイクを開始してください");
        return;
      }
      
      const ch = pc.createDataChannel("captions");
      wireDataChannel(ch);
      
      // 音声トラックが確実に含まれるようにする
      const audioTracks = localStreamRef.current.getAudioTracks();
      if (audioTracks.length === 0) {
        showToast("音声トラックが見つかりません");
        return;
      }
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitForICEGathering(pc);
      localSDPRef.current!.value = JSON.stringify(pc.localDescription);
      
      // Create Offer後、Remote SDPを表示
      setShowRemoteSDP(true);
      
      showToast("Offer created - 音声トラックが含まれています");
    } finally { setCreatingOffer(false); }
  }
  
  async function acceptOfferAndCreateAnswer() {
    if (!pc || !remoteSDPRef.current) return;
    setAnswering(true);
    try {
      const offer = JSON.parse(remoteSDPRef.current.value);
      await pc.setRemoteDescription(offer);
      
      // 音声トラックが追加されているか確認
      if (!localStreamRef.current) {
        showToast("先にマイクを開始してください");
        return;
      }
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await waitForICEGathering(pc);
      
      // Answerer側の場合、Local SDPを表示してから値を設定
      if (role === "answerer") {
        setAnswererLocalSDPValue(JSON.stringify(pc.localDescription));
        setShowAnswererLocalSDP(true);
      } else {
        // Caller側の場合は従来通り
        if (localSDPRef.current) {
          localSDPRef.current.value = JSON.stringify(pc.localDescription);
        }
      }
      
      showToast("Answer created - 音声トラックが含まれています");
    } finally { setAnswering(false); }
  }
  async function setRemoteDescriptionManual() {
    if (!pc || !remoteSDPRef.current) return;
    setSettingRemote(true);
    try {
      const remote = JSON.parse(remoteSDPRef.current.value);
  await pc.setRemoteDescription(remote);
  showToast("Remote description set");
  // ユーザー要望: Set Remote Description の後に接続設定を隠して
  // 音声・字幕を表示する（ただし機能はDOMに残す）
      setShowMediaUI(true);
      setShowConnectionUI(false);
      // dataChannel が開いていれば相手にも UI 切替を通知
      try {
        if (dataChannel && dataChannel.readyState === 'open') {
          dataChannel.send(JSON.stringify({ type: 'show_media_ui' }));
        }
      } catch {}
    } finally { setSettingRemote(false); }
  }

  async function sendCaption() {
    console.log('sendCaption called, dataChannel:', dataChannel);
    if (!dataChannel) {
      console.log('No dataChannel, returning');
      return;
    }
    if (sendingCaption) {
      console.log('Already sending, returning');
      return;
    }
    setSendingCaption(true);
    let text = sendText.trim(); 
    if (!text) { 
      console.log('No text to send, returning');
      setSendingCaption(false); 
      return; 
    }
    console.log('Sending text:', text);
    setSendText("");
    const src = fromLang === "auto" ? detect(text) : fromLang;
    const tgt = toLang === "auto" ? src : toLang;
    console.log('Translation: from', src, 'to', tgt);
    const outText = await translate(text, src, tgt, translator);
    console.log('Translated text:', outText);
    if (dataChannel.readyState !== "open") {
      console.log('DataChannel not open, queueing');
      dcQueueRef.current.push(outText);
      showToast("DataChannel not open — queued");
      setSendingCaption(false);
      return;
    }
    console.log('Sending to DataChannel');
    dataChannel.send(JSON.stringify({ type: "caption", text: outText }));
    setCaptions((old) => [...old.slice(-50), "(you) " + outText]);
    setSendingCaption(false);
    console.log('Send complete');
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

  // ヘッダータイトル：role / forcedRole に応じて表示を変更
  const headerTitle = (() => {
    if (page === 'home') return 'Nois WebRTC';
    const r = forcedRole ?? role;
    if (r === 'caller') return 'Call';
    if (r === 'answerer') return 'Reception';
    return 'Nois WebRTC';
  })();

  if (page === 'home') {
    // forcedRoleがある場合は直接call画面に遷移
    if (forcedRole) {
      setPage('call');
      // ページ遷移後にレンダリングを止める
      return null;
    }
    return <Home />;
  }

  if (showFriendList) {
    return <FriendList />;
  }

  return (
    <div className={`min-h-screen ${page==='call' ? 'bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900' : 'bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900'} p-2 md:p-4 overflow-hidden relative`}>
      {/* 背景画像 - CallとReception画面にのみ表示 */}
      {page === 'call' && (
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: 'url(/nois-background.png)',
            backgroundSize: 'contain',
            backgroundPosition: 'right top',
            backgroundRepeat: 'no-repeat',
            opacity: 0.1,
            top: '220px'
          }}
        />
      )}
      {/* Call/Recepton は背景を白にしてコンテンツと分離しない */}
      <div className={`h-full flex flex-col relative z-10 ${page==='call' ? 'mx-0 w-full' : 'mx-auto max-w-5xl rounded-2xl shadow-2xl bg-white/10 backdrop-blur-md border border-blue-300/30'}`}>
        {toast && <div className="fixed top-4 right-4 z-50 rounded-xl bg-black/90 text-white px-4 py-2 text-base shadow-2xl font-semibold tracking-wide animate-fadein">{toast}</div>}

        <Header 
          headerTitle={headerTitle}
          page={page}
          onBack={() => navigate('/home')}
          onSettingsClick={() => setTab("settings")}
        />

        {tab === "call" ? (
          <div className={`flex-1 flex flex-col lg:flex-row overflow-hidden bg-white/5 backdrop-blur-sm pb-24 ${ (showConnectionUI && showMediaUI) ? 'gap-3 p-3' : 'gap-0 p-0' }`}>
            {/* 左側：接続設定 */}
            <div className={`flex-shrink-0 ${showConnectionUI ? (showMediaUI ? 'w-full lg:w-1/2' : 'w-full lg:w-full') : 'w-0 lg:w-0'} space-y-3 transition-all ${showConnectionUI ? '' : 'opacity-0 pointer-events-none max-h-0 overflow-hidden'}`}>
                      {/* forcedRoleがない場合のみロール切替UIを表示 */}
                      {!forcedRole && (
                <div className="flex items-center gap-2 ml-auto mb-3">
                          <label className="text-sm font-medium text-gray-700">Role:</label>
                          <select className="border border-gray-300 px-2 py-1 text-sm bg-white" value={role} onChange={(e)=>setRole(e.target.value as Role)}>
                            <option value="caller">Caller</option>
                            <option value="answerer">Answerer</option>
                          </select>
                        </div>
                      )}
              
              {role === "caller" ? (
                <Caller
                  pc={pc}
                  localSDPRef={localSDPRef}
                  remoteSDPRef={remoteSDPRef}
                  localStreamRef={localStreamRef}
                  micEnabled={micEnabled}
                  micMuted={micMuted}
                  isInCall={isInCall}
                  creatingOffer={creatingOffer}
                  settingRemote={settingRemote}
                  copiedLocal={copiedLocal}
                  showLocalSDP={showLocalSDP}
                  showRemoteSDP={showRemoteSDP}
                  showConnectionUI={showConnectionUI}
                  showMediaUI={showMediaUI}
                  startMic={startMic}
                  stopMic={stopMic}
                  endCall={endCall}
                  createOffer={createOffer}
                  setRemoteDescriptionManual={setRemoteDescriptionManual}
                  showToast={showToast}
                  forcedRole={forcedRole}
                />
              ) : (
                <Reception
                  pc={pc}
                  remoteSDPRef={remoteSDPRef}
                  localStreamRef={localStreamRef}
                  micEnabled={micEnabled}
                  micMuted={micMuted}
                  isInCall={isInCall}
                  answering={answering}
                  settingRemote={settingRemote}
                  copiedLocal={copiedLocal}
                  showAnswererRemoteSDP={showAnswererRemoteSDP}
                  showAnswererLocalSDP={showAnswererLocalSDP}
                  showConnectionUI={showConnectionUI}
                  showMediaUI={showMediaUI}
                  answererLocalSDPValue={answererLocalSDPValue}
                  answererRemoteSDPInput={answererRemoteSDPInput}
                  startMic={startMic}
                  stopMic={stopMic}
                  endCall={endCall}
                  acceptOfferAndCreateAnswer={acceptOfferAndCreateAnswer}
                  setRemoteDescriptionManual={setRemoteDescriptionManual}
                  showToast={showToast}
                  setAnswererRemoteSDPInput={setAnswererRemoteSDPInput}
                  forcedRole={forcedRole}
                />
              )}
            </div>

            {/* 右側：音声と字幕 */}
            <div className={`${showMediaUI ? 'w-full lg:w-full' : 'w-0 lg:w-0'} flex-1 flex flex-col space-y-3 transition-all ${showMediaUI ? '' : 'opacity-0 pointer-events-none max-h-0 overflow-hidden'}`}>
              <MediaUI
                remoteAudioRef={remoteAudioRef}
                micMuted={micMuted}
                speakerOn={speakerOn}
                showCamera={showCamera}
                isInCall={isInCall}
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
          </div>
        ) : (
          <div className="flex-1 bg-white/5 backdrop-blur-sm relative z-10 p-4 rounded-xl">
            <div className="space-y-6">
              {/* ヘッダー */}
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-300 to-blue-200 bg-clip-text text-transparent">
                  通話設定
                </h2>
              </div>

              {/* 翻訳設定セクション */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
                  </svg>
                  翻訳設定
                </h3>
                
                <div className="space-y-4">
                  <div>
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
                </div>
              </div>

              {/* 音声設定セクション */}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
                  </svg>
                  音声設定
                </h3>
                
                <div className="space-y-4">

                  {speakOnReceive && (
                    <div className="space-y-3 rounded-lg">
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
                      </div>
                      
                      <div className="flex justify-center">
                        <button 
                          onClick={()=>{ 
                            const sample = ttsLang==="ja"?"テスト。こんにちは。":"Test: Hello there."; 
                            speak(sample); 
                          }} 
                          className="px-6 py-2 mt-4 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white text-sm font-medium rounded-lg hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                          <img src="/offspeaker.png" alt="speaker" className="w-6 h-6 object-contain" />
                          音声テスト
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>


              {/* 戻るボタン */}
              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => setTab("call")}
                  className="px-8 py-3 bg-gradient-to-r from-slate-600 to-gray-700 text-white font-medium rounded-xl hover:from-slate-700 hover:to-gray-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  設定を閉じる
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* ナビゲーションバー（フッター） */}
      <Footer />

      {/* 着信通知モーダル */}
      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={answerCall}
          onReject={rejectCall}
        />
      )}
    </div>
  );
}

async function waitForICEGathering(pc: RTCPeerConnection) {
  if (pc.iceGatheringState === "complete") return;
  await new Promise<void>((resolve) => {
    function check(){ if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", check); resolve(); } }
    pc.addEventListener("icegatheringstatechange", check);
    setTimeout(check, 2000);
  });
}
