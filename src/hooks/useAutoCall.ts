import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, get } from 'firebase/database';
import { database } from '../firebase/config';
import { callService, CallRoom } from '../services/CallService';

interface UseAutoCallProps {
  userId: string;
  userName: string;
  pc: RTCPeerConnection | null;
  localStreamRef: React.RefObject<MediaStream | null>;
  onCallConnected: () => void;
  onCallEnded: () => void;
}

export function useAutoCall({
  userId,
  userName,
  pc,
  localStreamRef,
  onCallConnected,
  onCallEnded
}: UseAutoCallProps) {
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // 着信通知を監視
  useEffect(() => {
    const unsubscribe = callService.watchIncomingCall(userId, (incomingCall) => {
      setIncomingCall(incomingCall);
    });

    return () => {
      unsubscribe();
    };
  }, [userId]);

  // 通話ルームの状態を監視
  useEffect(() => {
    if (!currentRoomId) return;

    const unsubscribe = callService.watchCallRoom(currentRoomId, (room: CallRoom | null) => {
      if (!room) return;

      if (room.status === 'answered' && !isCallActive) {
        // 通話が応答されたら自動でSDP交換を開始
        handleCallAnswered(room);
      } else if (room.status === 'rejected' || room.status === 'ended') {
        // 通話が拒否または終了されたら
        handleCallEnded();
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentRoomId, isCallActive]);

  // 通話に応答
  const handleCallAnswered = async (room: CallRoom) => {
    if (!pc || !localStreamRef.current) return;

    try {
      // 音声ストリームを追加
      localStreamRef.current.getAudioTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });

      // 相手がCallerの場合、Answerを作成
      if (room.callerId !== userId) {
        await createAnswer(room);
      } else {
        // 自分がCallerの場合、Offerを待つ
        await waitForOffer(room);
      }

      setIsCallActive(true);
      onCallConnected();
    } catch (error) {
      console.error('通話接続エラー:', error);
    }
  };

  // Answerを作成
  const createAnswer = async (room: CallRoom) => {
    if (!pc || !room.sdpOffer) return;

    try {
      // 相手のOfferを設定
      await pc.setRemoteDescription(JSON.parse(room.sdpOffer));
      
      // Answerを作成
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Answerを保存
      await callService.saveSdpAnswer(room.id, JSON.stringify(answer));
    } catch (error) {
      console.error('Answer作成エラー:', error);
    }
  };

  // Offerを待つ
  const waitForOffer = async (room: CallRoom) => {
    if (!pc) return;

    try {
      // DataChannelを作成
      const dataChannel = pc.createDataChannel('captions');
      
      // Offerを作成
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      // Offerを保存
      await callService.saveSdpOffer(room.id, JSON.stringify(offer));
      
      // Answerを待つ
      const checkForAnswer = setInterval(async () => {
        const updatedRoom = await get(ref(database, `callRooms/${room.id}`));
        const roomData = updatedRoom.val();
        
        if (roomData?.sdpAnswer) {
          clearInterval(checkForAnswer);
          await pc.setRemoteDescription(JSON.parse(roomData.sdpAnswer));
        }
      }, 1000);
    } catch (error) {
      console.error('Offer作成エラー:', error);
    }
  };

  // 通話終了処理
  const handleCallEnded = () => {
    setIsCallActive(false);
    setCurrentRoomId(null);
    onCallEnded();
  };

  // 着信に応答
  const answerCall = async () => {
    if (!incomingCall) return;

    await callService.answerCall(incomingCall.roomId, userId);
    setCurrentRoomId(incomingCall.roomId);
    setIncomingCall(null);
  };

  // 着信を拒否
  const rejectCall = async () => {
    if (!incomingCall) return;

    await callService.rejectCall(incomingCall.roomId, userId);
    setIncomingCall(null);
  };

  // 通話を開始
  const startCall = async (friendId: string, friendName: string) => {
    try {
      const roomId = await callService.createCallRoom(userId, friendId, userName, friendName);
      setCurrentRoomId(roomId);
      navigate(`/caller?roomId=${roomId}`);
    } catch (error) {
      console.error('通話開始エラー:', error);
    }
  };

  // 通話を終了
  const endCall = async () => {
    if (currentRoomId) {
      await callService.endCall(currentRoomId);
      await callService.deleteCallRoom(currentRoomId);
    }
    handleCallEnded();
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
