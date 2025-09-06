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

  // メッセージを送信
  async sendMessage(senderId: string, receiverId: string, content: string, senderName: string): Promise<string> {
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

    await set(messageRef, message);
    return messageId;
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
