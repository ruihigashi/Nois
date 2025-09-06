import { ref, set, get, onValue, off, push, query, orderByChild, limitToLast } from 'firebase/database';
import { database } from '../firebase/config';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  senderName: string;
  isRead: boolean;
}

class MessageService {
  private messagesRef = ref(database, 'messages');

  // Firebase Realtime Databaseの状態確認
  checkDatabaseStatus(): void {
    try {
      console.log('MessageService: Database状態確認');
      console.log('MessageService: Database app:', database.app);
      console.log('MessageService: Database options:', database.app.options);
      console.log('MessageService: Database URL:', database.app.options.databaseURL);
      
      if (!database.app.options.databaseURL) {
        console.error('MessageService: Database URLが設定されていません');
        throw new Error('Database URLが設定されていません');
      }
      
      console.log('MessageService: Database状態正常');
    } catch (error) {
      console.error('MessageService: Database状態確認エラー', error);
      throw error;
    }
  }

  // Firebase接続テスト
  async testConnection(): Promise<boolean> {
    try {
      console.log('MessageService: Firebase接続テスト開始');
      console.log('MessageService: Database URL:', database.app.options.databaseURL);
      console.log('MessageService: Database connected:', database.app.name);
      
      const testRef = ref(database, 'test');
      console.log('MessageService: テスト参照作成:', testRef.toString());
      
      const testData = { test: true, timestamp: Date.now() };
      console.log('MessageService: テストデータ:', testData);
      
      await set(testRef, testData);
      console.log('MessageService: Firebase接続テスト成功');
      return true;
    } catch (error) {
      console.error('MessageService: Firebase接続テスト失敗', error);
      console.error('MessageService: エラー詳細:', {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      return false;
    }
  }

  // メッセージを送信
  async sendMessage(senderId: string, senderName: string, receiverId: string, content: string): Promise<string> {
    try {
      console.log('MessageService: メッセージ送信開始', { senderId, senderName, receiverId, content });
      
      const messageRef = push(this.messagesRef);
      const messageId = messageRef.key!;
      
      const message: Message = {
        id: messageId,
        senderId,
        receiverId,
        content,
        timestamp: Date.now(),
        senderName,
        isRead: false
      };

      console.log('MessageService: メッセージデータ作成完了', message);
      
      // タイムアウト付きでFirebase書き込み
      console.log('MessageService: Firebase書き込み開始...');
      console.log('MessageService: 書き込み先パス:', messageRef.toString());
      
      const writePromise = set(messageRef, message).then(() => {
        console.log('MessageService: set()完了');
        return messageId;
      }).catch((error) => {
        console.error('MessageService: set()エラー詳細:', error);
        throw error;
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => {
          console.error('MessageService: タイムアウト発生');
          reject(new Error('Firebase書き込みタイムアウト'));
        }, 10000)
      );
      
      const result = await Promise.race([writePromise, timeoutPromise]);
      console.log('MessageService: Firebase書き込み完了');
      console.log('MessageService: メッセージ送信成功', result);
      
      return messageId;
    } catch (error) {
      console.error('MessageService: メッセージ送信エラー', error);
      throw error;
    }
  }

  // ユーザー間の最後のメッセージを取得
  async getLastMessage(userId1: string, userId2: string): Promise<Message | null> {
    try {
      const messagesQuery = query(
        this.messagesRef,
        orderByChild('timestamp')
      );
      
      const snapshot = await get(messagesQuery);
      const messages = snapshot.val();
      
      if (!messages) return null;

      // ユーザー間のメッセージをフィルタリング
      const userMessages = Object.values(messages).filter((message: any) => 
        (message.senderId === userId1 && message.receiverId === userId2) ||
        (message.senderId === userId2 && message.receiverId === userId1)
      ) as Message[];

      // 最新のメッセージを返す
      if (userMessages.length === 0) return null;
      
      return userMessages.sort((a, b) => b.timestamp - a.timestamp)[0];
    } catch (error) {
      console.error('メッセージ取得エラー:', error);
      return null;
    }
  }

  // ユーザーの全フレンドとの最後のメッセージを取得
  async getLastMessagesForUser(userId: string, friendIds: string[]): Promise<Record<string, Message | null>> {
    const lastMessages: Record<string, Message | null> = {};
    
    try {
      for (const friendId of friendIds) {
        try {
          const lastMessage = await this.getLastMessage(userId, friendId);
          lastMessages[friendId] = lastMessage;
        } catch (error) {
          console.error(`フレンド ${friendId} のメッセージ取得エラー:`, error);
          lastMessages[friendId] = null;
        }
      }
    } catch (error) {
      console.error('メッセージ一括取得エラー:', error);
    }
    
    return lastMessages;
  }

  // メッセージを既読にする
  async markAsRead(messageId: string) {
    await set(ref(database, `messages/${messageId}/isRead`), true);
  }

  // ユーザー間のメッセージを監視
  watchMessages(userId1: string, userId2: string, callback: (messages: Message[]) => void) {
    const messagesQuery = query(
      this.messagesRef,
      orderByChild('timestamp')
    );
    
    const unsubscribe = onValue(messagesQuery, (snapshot) => {
      try {
        const messages = snapshot.val();
        
        if (!messages) {
          callback([]);
          return;
        }

        // ユーザー間のメッセージをフィルタリング
        const userMessages = Object.values(messages).filter((message: any) => 
          (message.senderId === userId1 && message.receiverId === userId2) ||
          (message.senderId === userId2 && message.receiverId === userId1)
        ) as Message[];

        // タイムスタンプ順にソート
        userMessages.sort((a, b) => a.timestamp - b.timestamp);
        callback(userMessages);
      } catch (error) {
        console.error('メッセージ監視エラー:', error);
        callback([]);
      }
    });

    return unsubscribe;
  }
}

export const messageService = new MessageService();
