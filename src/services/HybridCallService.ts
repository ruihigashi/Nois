import { callService, CallRoom as FirebaseCallRoom, IncomingCall as FirebaseIncomingCall } from './CallService';
import { localCallService, CallRoom as LocalCallRoom, IncomingCall as LocalIncomingCall } from './LocalCallService';

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

class HybridCallService {
  private useFirebase = false; // ローカルストレージを優先使用

  // 通話ルームを作成
  async createCallRoom(callerId: string, friendId: string, callerName: string, friendName: string): Promise<string> {
    console.log('HybridCallService: 通話ルーム作成開始', { callerId, friendId, callerName, friendName });
    
    try {
      if (this.useFirebase) {
        console.log('HybridCallService: Firebaseで通話ルーム作成を試行');
        const roomId = await callService.createCallRoom(callerId, friendId, callerName, friendName);
        
        // Firebaseが成功した場合、ローカルにも保存（バックアップ）
        try {
          await localCallService.createCallRoom(callerId, friendId, callerName, friendName);
          console.log('HybridCallService: ローカルバックアップも完了');
        } catch (localError) {
          console.warn('HybridCallService: ローカルバックアップ失敗（無視）', localError);
        }
        
        return roomId;
      } else {
        throw new Error('Firebase無効');
      }
    } catch (firebaseError) {
      console.warn('HybridCallService: Firebase通話ルーム作成失敗、ローカルにフォールバック', firebaseError);
      
      try {
        const roomId = await localCallService.createCallRoom(callerId, friendId, callerName, friendName);
        console.log('HybridCallService: ローカル通話ルーム作成成功', roomId);
        return roomId;
      } catch (localError) {
        console.error('HybridCallService: ローカル通話ルーム作成も失敗', localError);
        throw localError;
      }
    }
  }

  // 通話ルームを取得
  async getCallRoom(roomId: string): Promise<CallRoom | null> {
    console.log('HybridCallService: 通話ルーム取得', roomId);
    
    if (this.useFirebase) {
      try {
        return await callService.getCallRoom(roomId);
      } catch (error) {
        console.warn('HybridCallService: Firebase取得失敗、ローカルにフォールバック', error);
        return await localCallService.getCallRoom(roomId);
      }
    } else {
      return await localCallService.getCallRoom(roomId);
    }
  }

  // 通話ルームの状態を更新
  async updateCallRoomStatus(roomId: string, status: CallRoom['status']): Promise<void> {
    console.log('HybridCallService: 通話ルーム状態更新', { roomId, status });
    
    if (this.useFirebase) {
      try {
        await callService.updateCallRoomStatus(roomId, status);
      } catch (error) {
        console.warn('HybridCallService: Firebase状態更新失敗、ローカルにフォールバック', error);
      }
    }
    
    // ローカルでも更新
    try {
      await localCallService.updateCallRoomStatus(roomId, status);
    } catch (error) {
      console.warn('HybridCallService: ローカル状態更新失敗', error);
    }
  }

  // 通話ルームの状態を監視
  watchCallRoom(roomId: string, callback: (room: CallRoom | null) => void) {
    console.log('HybridCallService: 通話ルーム監視開始', roomId);
    
    if (this.useFirebase) {
      try {
        return callService.watchCallRoom(roomId, callback);
      } catch (error) {
        console.warn('HybridCallService: Firebase監視失敗、ローカルにフォールバック', error);
        return localCallService.watchCallRoom(roomId, callback);
      }
    } else {
      return localCallService.watchCallRoom(roomId, callback);
    }
  }

  // 着信通知を監視
  watchIncomingCall(userId: string, callback: (incomingCall: IncomingCall | null) => void) {
    console.log('HybridCallService: 着信通知監視開始', userId);
    
    if (this.useFirebase) {
      try {
        return callService.watchIncomingCall(userId, callback);
      } catch (error) {
        console.warn('HybridCallService: Firebase着信監視失敗、ローカルにフォールバック', error);
        return localCallService.watchIncomingCall(userId, callback);
      }
    } else {
      return localCallService.watchIncomingCall(userId, callback);
    }
  }

  // 着信通知をクリア
  async clearIncomingCall(userId: string) {
    console.log('HybridCallService: 着信通知クリア', userId);
    
    if (this.useFirebase) {
      try {
        await callService.clearIncomingCall(userId);
      } catch (error) {
        console.warn('HybridCallService: Firebase通知クリア失敗', error);
      }
    }
    
    // ローカルでもクリア
    try {
      await localCallService.clearIncomingCall(userId);
    } catch (error) {
      console.warn('HybridCallService: ローカル通知クリア失敗', error);
    }
  }

  // 通話を終了
  async endCall(roomId: string) {
    console.log('HybridCallService: 通話終了', roomId);
    
    if (this.useFirebase) {
      try {
        await callService.endCall(roomId);
      } catch (error) {
        console.warn('HybridCallService: Firebase通話終了失敗', error);
      }
    }
    
    // ローカルでも終了
    try {
      await localCallService.endCall(roomId);
    } catch (error) {
      console.warn('HybridCallService: ローカル通話終了失敗', error);
    }
  }

  // Firebaseの使用を無効化（ローカルのみ使用）
  disableFirebase() {
    console.log('HybridCallService: Firebaseを無効化、ローカルのみ使用');
    this.useFirebase = false;
  }

  // Firebaseの使用を有効化
  enableFirebase() {
    console.log('HybridCallService: Firebaseを有効化');
    this.useFirebase = true;
  }
}

export const hybridCallService = new HybridCallService();
