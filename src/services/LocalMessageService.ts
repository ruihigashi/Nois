export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  senderName: string;
  isRead: boolean;
}

class LocalMessageService {
  private storageKey = 'nois_messages';

  // メッセージを送信（ローカルストレージに保存）
  async sendMessage(senderId: string, senderName: string, receiverId: string, content: string): Promise<string> {
    try {
      console.log('LocalMessageService: メッセージ送信開始', { senderId, senderName, receiverId, content });
      
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const message: Message = {
        id: messageId,
        senderId,
        receiverId,
        content,
        timestamp: Date.now(),
        senderName,
        isRead: false
      };

      // 既存のメッセージを取得
      const existingMessages = this.getAllMessages();
      
      // 新しいメッセージを追加
      existingMessages.push(message);
      
      // ローカルストレージに保存
      localStorage.setItem(this.storageKey, JSON.stringify(existingMessages));
      
      console.log('LocalMessageService: メッセージ送信成功', messageId);
      return messageId;
    } catch (error: any) {
      console.error('LocalMessageService: メッセージ送信エラー', error);
      throw error;
    }
  }

  // すべてのメッセージを取得
  private getAllMessages(): Message[] {
    try {
      const messagesJson = localStorage.getItem(this.storageKey);
      return messagesJson ? JSON.parse(messagesJson) : [];
    } catch (error) {
      console.error('LocalMessageService: メッセージ取得エラー', error);
      return [];
    }
  }

  // ユーザー間のメッセージを監視（ポーリング方式）
  watchMessages(userId1: string, userId2: string, callback: (messages: Message[]) => void) {
    console.log('LocalMessageService: メッセージ監視開始', { userId1, userId2 });
    
    // 即座に現在のメッセージを取得
    const getMessages = () => {
      const allMessages = this.getAllMessages();
      const userMessages = allMessages.filter((message: Message) =>
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
      );
      
      // タイムスタンプ順にソート
      userMessages.sort((a, b) => a.timestamp - b.timestamp);
      callback(userMessages);
    };

    // 初回実行
    getMessages();

    // 定期的にポーリング（1秒間隔）
    const intervalId = setInterval(getMessages, 1000);

    // ストレージ変更イベントを監視
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === this.storageKey) {
        getMessages();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // クリーンアップ関数を返す
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('storage', handleStorageChange);
    };
  }

  // ユーザーの全フレンドとの最後のメッセージを取得
  async getLastMessagesForUser(userId: string, friendIds: string[]): Promise<Record<string, Message | null>> {
    const lastMessages: Record<string, Message | null> = {};
    
    try {
      console.log('LocalMessageService: 最後のメッセージ取得開始', { userId, friendIds });
      
      const allMessages = this.getAllMessages();
      
      for (const friendId of friendIds) {
        const userMessages = allMessages.filter((message: Message) =>
          (message.senderId === userId && message.receiverId === friendId) ||
          (message.senderId === friendId && message.receiverId === userId)
        );
        
        if (userMessages.length > 0) {
          // 最新のメッセージを取得
          const lastMessage = userMessages.sort((a, b) => b.timestamp - a.timestamp)[0];
          lastMessages[friendId] = lastMessage;
        } else {
          lastMessages[friendId] = null;
        }
      }
    } catch (error) {
      console.error('LocalMessageService: メッセージ一括取得エラー', error);
    }
    
    return lastMessages;
  }

  // メッセージを既読にする
  async markAsRead(messageId: string) {
    try {
      const allMessages = this.getAllMessages();
      const messageIndex = allMessages.findIndex((msg: Message) => msg.id === messageId);
      
      if (messageIndex !== -1) {
        allMessages[messageIndex].isRead = true;
        localStorage.setItem(this.storageKey, JSON.stringify(allMessages));
      }
    } catch (error) {
      console.error('LocalMessageService: 既読設定エラー', error);
    }
  }
}

export const localMessageService = new LocalMessageService();
