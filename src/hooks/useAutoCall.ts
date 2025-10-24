import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hybridCallService, CallRoom } from '../services/HybridCallService';

interface UseAutoCallProps {
  userId: string;
  userName: string;
  pc: RTCPeerConnection | null;
  localStreamRef: React.RefObject<MediaStream | null>;
  startMic: () => Promise<void>;
  onCallConnected: () => void;
  onCallEnded: () => void;
}

export function useAutoCall({
  userId,
  userName,
  pc,
  localStreamRef,
  startMic,
  onCallConnected,
  onCallEnded
}: UseAutoCallProps) {
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [processedIceCandidates, setProcessedIceCandidates] = useState<{[key: string]: boolean}>({});

  // 着信通知を監視
  useEffect(() => {
    if (!userId) return;
    const unsubscribe = hybridCallService.watchIncomingCall(userId, (call) => {
      if (call) {
        setIncomingCall(call);
      } else {
        setIncomingCall(null);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  // 着信中に相手がキャンセルしたのを検知
  useEffect(() => {
    if (incomingCall && incomingCall.roomId && !isCallActive) {
      const unsubscribe = hybridCallService.watchCallRoom(incomingCall.roomId, (room) => {
        if (!room || room.status === 'ended' || room.status === 'rejected') {
          setIncomingCall(null);
        }
      });
      return () => unsubscribe();
    }
  }, [incomingCall, isCallActive]);

  // 通話ルームの状態を監視し、シグナリングを処理
  useEffect(() => {
    if (!currentRoomId || !pc) return;

    const unsubscribe = hybridCallService.watchCallRoom(currentRoomId, async (room: CallRoom | null) => {
      if (!room) return;

      // 発信者のみがAnswerを処理する
      if (room.callerId === userId && room.sdpAnswer && pc.remoteDescription?.type !== 'answer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(room.sdpAnswer)));
          console.log('Answer設定完了');
          // 発信側がAnswerを受け取ったら通話中にする
          if (!isCallActive) {
            setIsCallActive(true);
            onCallConnected();
          }
        } catch (error) {
          console.error('Answer設定エラー:', error);
        }
      }

      // 相手のICE候補を処理
      const role = room.callerId === userId ? 'answerer' : 'caller';
      if (room.iceCandidates && room.iceCandidates[role]) {
        const candidates = room.iceCandidates[role];
        for (const key in candidates) {
          if (!processedIceCandidates[key]) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidates[key]));
              setProcessedIceCandidates(prev => ({ ...prev, [key]: true }));
              console.log('相手のICE候補を追加:', candidates[key]);
            } catch (error) {
              console.error('ICE候補追加エラー:', error);
            }
          }
        }
      }

      // 通話終了/拒否
      if (room.status === 'rejected' || room.status === 'ended') {
        endCall(false); // DB更新は不要
      }
    });

    return () => unsubscribe();
  }, [currentRoomId, pc, processedIceCandidates, userId, isCallActive, onCallConnected]);

  // 着信に応答
  const answerCall = async () => {
    if (!incomingCall || !pc) return;

    await startMic();
    if (!localStreamRef.current) return;

    const { roomId } = incomingCall;
    setCurrentRoomId(roomId);
    setProcessedIceCandidates({});

    // 相手（発信者）のICE候補をリッスン
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        hybridCallService.addIceCandidate(roomId, event.candidate.toJSON(), 'answerer');
      }
    };

    // 自分のメディアトラックを接続に追加
    localStreamRef.current.getTracks().forEach(track => {
      pc.addTrack(track, localStreamRef.current!);
    });

    const room = await hybridCallService.getCallRoom(roomId);
    if (room && room.sdpOffer) {
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(room.sdpOffer)));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await hybridCallService.saveSdpAnswer(roomId, JSON.stringify(answer));
        await hybridCallService.updateCallRoomStatus(roomId, 'answered');
        setIsCallActive(true);
        onCallConnected();
        navigate(`/caller?roomId=${roomId}&friendId=${room.callerId}&friendName=${room.callerName}`);
      } catch (error) {
        console.error('Answer処理エラー:', error);
      }
    }
    setIncomingCall(null);
  };

  // 着信を拒否
  const rejectCall = async () => {
    if (!incomingCall) return;
    await hybridCallService.updateCallRoomStatus(incomingCall.roomId, 'rejected');
    setIncomingCall(null);
  };

  // 通話を開始
  const startCall = async (friendId: string, friendName: string) => {
    if (!pc || !localStreamRef.current) return;
    let roomId: string | null = null;
    try {
      roomId = await hybridCallService.createCallRoom(userId, friendId, userName, friendName);
      setCurrentRoomId(roomId);
      setProcessedIceCandidates({});

      // 相手（応答者）のICE候補をリッスン
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          hybridCallService.addIceCandidate(roomId!, event.candidate.toJSON(), 'caller');
        }
      };

      // 自分のメディアトラックを接続に追加
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await hybridCallService.saveSdpOffer(roomId, JSON.stringify(offer));
      
      navigate(`/caller?roomId=${roomId}&friendId=${friendId}&friendName=${friendName}`);
    } catch (error) {
      console.error('startCall Error:', error);
      if (roomId) {
        endCall();
      }
    }
  };

  // 通話を終了
  const endCall = async (updateDb = true) => {
    if (currentRoomId) {
      if (updateDb) {
        await hybridCallService.endCall(currentRoomId);
      }
      setIsCallActive(false);
      setCurrentRoomId(null);
      setProcessedIceCandidates({});
      pc?.close();
      onCallEnded();
      navigate(-1);
    }
  };

  return {
    incomingCall,
    isCallActive,
    answerCall,
    rejectCall,
    startCall,
    endCall
  };
}