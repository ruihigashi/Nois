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

class LocalCallService {
  private storageKey = 'nois_call_rooms';
  private notificationsKey = 'nois_call_notifications';

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

    // ローカルストレージに保存
    this.saveCallRoom(callRoom);
    
    // 相手に着信通知を送信
    await this.sendIncomingCallNotification(friendId, {
      roomId,
      callerId,
      callerName,
      timestamp: Date.now()
    });

    return roomId;
  }

  // 通話ルームを取得
  async getCallRoom(roomId: string): Promise<CallRoom | null> {
    try {
      const rooms = this.getAllCallRooms();
      return rooms.find(room => room.id === roomId) || null;
    } catch (error) {
      console.error('通話ルーム取得エラー:', error);
      return null;
    }
  }

  // 通話ルームの状態を更新
  async updateCallRoomStatus(roomId: string, status: CallRoom['status']): Promise<void> {
    try {
      const rooms = this.getAllCallRooms();
      const roomIndex = rooms.findIndex(room => room.id === roomId);
      
      if (roomIndex !== -1) {
        rooms[roomIndex].status = status;
        rooms[roomIndex].createdAt = Date.now();
        this.saveAllCallRooms(rooms);
      }
    } catch (error) {
      console.error('通話ルーム状態更新エラー:', error);
    }
  }

  // 通話ルームの状態を監視
  watchCallRoom(roomId: string, callback: (room: CallRoom | null) => void) {
    console.log('LocalCallService: 通話ルーム監視開始', roomId);
    
    const checkRoom = () => {
      const room = this.getAllCallRooms().find(r => r.id === roomId);
      callback(room || null);
    };

    // 即座に現在の状態を取得
    checkRoom();

    // 定期的にポーリング（1秒間隔）
    const intervalId = setInterval(checkRoom, 1000);

    // ストレージ変更イベントを監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.storageKey) {
        checkRoom();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // クリーンアップ関数を返す
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  // 着信通知を送信
  private async sendIncomingCallNotification(friendId: string, notification: IncomingCall) {
    try {
      const notifications = this.getUserNotifications(friendId);
      notifications.push(notification);
      this.saveUserNotifications(friendId, notifications);
      
      // ストレージ変更イベントを発火
      window.dispatchEvent(new StorageEvent('storage', {
        key: `${this.notificationsKey}_${friendId}`,
        newValue: JSON.stringify(notifications)
      }));
    } catch (error) {
      console.error('着信通知送信エラー:', error);
    }
  }

  // 着信通知を監視
  watchIncomingCall(userId: string, callback: (incomingCall: IncomingCall | null) => void) {
    console.log('LocalCallService: 着信通知監視開始', userId);
    
    const checkNotifications = () => {
      const notifications = this.getUserNotifications(userId);
      const latestNotification = notifications.length > 0 ? notifications[notifications.length - 1] : null;
      callback(latestNotification);
    };

    // 即座に現在の通知を取得
    checkNotifications();

    // 定期的にポーリング（1秒間隔）
    const intervalId = setInterval(checkNotifications, 1000);

    // ストレージ変更イベントを監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `${this.notificationsKey}_${userId}`) {
        checkNotifications();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // クリーンアップ関数を返す
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  // 着信通知をクリア
  async clearIncomingCall(userId: string) {
    try {
      this.saveUserNotifications(userId, []);
    } catch (error) {
      console.error('着信通知クリアエラー:', error);
    }
  }

  // 通話ルームを削除
  async endCall(roomId: string) {
    try {
      const rooms = this.getAllCallRooms();
      const filteredRooms = rooms.filter(room => room.id !== roomId);
      this.saveAllCallRooms(filteredRooms);
    } catch (error) {
      console.error('通話終了エラー:', error);
    }
  }

  // ユーティリティメソッド
  private generateRoomId(): string {
    return `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getAllCallRooms(): CallRoom[] {
    try {
      const roomsJson = localStorage.getItem(this.storageKey);
      return roomsJson ? JSON.parse(roomsJson) : [];
    } catch (error) {
      console.error('通話ルーム取得エラー:', error);
      return [];
    }
  }

  private saveCallRoom(room: CallRoom) {
    const rooms = this.getAllCallRooms();
    const existingIndex = rooms.findIndex(r => r.id === room.id);
    
    if (existingIndex !== -1) {
      rooms[existingIndex] = room;
    } else {
      rooms.push(room);
    }
    
    this.saveAllCallRooms(rooms);
  }

  private saveAllCallRooms(rooms: CallRoom[]) {
    localStorage.setItem(this.storageKey, JSON.stringify(rooms));
  }

  private getUserNotifications(userId: string): IncomingCall[] {
    try {
      const notificationsJson = localStorage.getItem(`${this.notificationsKey}_${userId}`);
      return notificationsJson ? JSON.parse(notificationsJson) : [];
    } catch (error) {
      console.error('着信通知取得エラー:', error);
      return [];
    }
  }

  private saveUserNotifications(userId: string, notifications: IncomingCall[]) {
    localStorage.setItem(`${this.notificationsKey}_${userId}`, JSON.stringify(notifications));
  }
}

export const localCallService = new LocalCallService();
