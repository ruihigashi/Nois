import { ref, set, get, onValue, off, remove, push } from 'firebase/database';
import { database } from '../firebase/config';

export interface CallRoom {
  id: string;
  callerId: string;
  friendId: string;
  status: 'ringing' | 'answered' | 'rejected' | 'ended';
  sdpOffer?: string;
  sdpAnswer?: string;
  createdAt: number;
  callerName?: string;
  friendName?: string;
}

export interface IncomingCall {
  roomId: string;
  callerId: string;
  callerName: string;
  timestamp: number;
}

class CallService {
  private callRoomsRef = ref(database, 'callRooms');
  private userNotificationsRef = ref(database, 'userNotifications');

  // 通話ルームを作成
  async createCallRoom(callerId: string, friendId: string, callerName: string, friendName: string): Promise<string> {
    const roomId = this.generateRoomId();
    const callRoom: CallRoom = {
      id: roomId,
      callerId,
      friendId,
      status: 'ringing',
      createdAt: Date.now(),
      callerName,
      friendName
    };

    await set(ref(database, `callRooms/${roomId}`), callRoom);
    
    // 相手に着信通知を送信
    await this.sendIncomingCallNotification(friendId, {
      roomId,
      callerId,
      callerName,
      timestamp: Date.now()
    });

    return roomId;
  }

  // 着信通知を送信
  private async sendIncomingCallNotification(userId: string, incomingCall: IncomingCall) {
    await set(ref(database, `userNotifications/${userId}/incomingCall`), incomingCall);
  }

  // 通話に応答
  async answerCall(roomId: string, friendId: string) {
    await set(ref(database, `callRooms/${roomId}/status`), 'answered');
    await this.clearIncomingCallNotification(friendId);
  }

  // 通話を拒否
  async rejectCall(roomId: string, friendId: string) {
    await set(ref(database, `callRooms/${roomId}/status`), 'rejected');
    await this.clearIncomingCallNotification(friendId);
  }

  // 通話を終了
  async endCall(roomId: string) {
    await set(ref(database, `callRooms/${roomId}/status`), 'ended');
  }

  // SDPオファーを保存
  async saveSdpOffer(roomId: string, sdpOffer: string) {
    await set(ref(database, `callRooms/${roomId}/sdpOffer`), sdpOffer);
  }

  // SDPアンサーを保存
  async saveSdpAnswer(roomId: string, sdpAnswer: string) {
    await set(ref(database, `callRooms/${roomId}/sdpAnswer`), sdpAnswer);
  }

  // 通話ルームの状態を監視
  watchCallRoom(roomId: string, callback: (room: CallRoom | null) => void) {
    const roomRef = ref(database, `callRooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const room = snapshot.val();
      callback(room);
    });
    return unsubscribe;
  }

  // 着信通知を監視
  watchIncomingCall(userId: string, callback: (incomingCall: IncomingCall | null) => void) {
    const notificationRef = ref(database, `userNotifications/${userId}/incomingCall`);
    const unsubscribe = onValue(notificationRef, (snapshot) => {
      const incomingCall = snapshot.val();
      callback(incomingCall);
    });
    return unsubscribe;
  }

  // 着信通知をクリア
  async clearIncomingCallNotification(userId: string) {
    await remove(ref(database, `userNotifications/${userId}/incomingCall`));
  }

  // 通話ルームを削除
  async deleteCallRoom(roomId: string) {
    await remove(ref(database, `callRooms/${roomId}`));
  }

  // ルームIDを生成
  private generateRoomId(): string {
    return 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
}

export const callService = new CallService();
