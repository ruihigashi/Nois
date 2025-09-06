import { collection, addDoc, query, where, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  senderName: string;
  isRead: boolean;
}

class FirestoreMessageService {
  private messagesCollection = collection(db, 'messages');

  // メッセージを送信
  async sendMessage(senderId: string, senderName: string, receiverId: string, content: string): Promise<string> {
    try {
      console.log('FirestoreMessageService: メッセージ送信開始', { senderId, senderName, receiverId, content });
      
      const messageData = {
        senderId,
        receiverId,
        content,
        timestamp: Timestamp.now(),
        senderName,
        isRead: false
      };

      console.log('FirestoreMessageService: メッセージデータ作成完了', messageData);
      
      const docRef = await addDoc(this.messagesCollection, messageData);
      console.log('FirestoreMessageService: メッセージ送信成功', docRef.id);
      
      return docRef.id;
    } catch (error: any) {
      console.error('FirestoreMessageService: メッセージ送信エラー', error);
      throw error;
    }
  }

  // ユーザー間のメッセージを監視
  watchMessages(userId1: string, userId2: string, callback: (messages: Message[]) => void) {
    try {
      console.log('FirestoreMessageService: メッセージ監視開始', { userId1, userId2 });
      
      const q = query(
        this.messagesCollection,
        where('senderId', 'in', [userId1, userId2]),
        where('receiverId', 'in', [userId1, userId2]),
        orderBy('timestamp', 'asc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        try {
          const messages: Message[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            // 送信者と受信者が正しい組み合わせかチェック
            if ((data.senderId === userId1 && data.receiverId === userId2) ||
                (data.senderId === userId2 && data.receiverId === userId1)) {
              messages.push({
                id: doc.id,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                timestamp: data.timestamp.toMillis(),
                senderName: data.senderName,
                isRead: data.isRead
              });
            }
          });
          
          console.log('FirestoreMessageService: メッセージ取得完了', messages.length, '件');
          callback(messages);
        } catch (error) {
          console.error('FirestoreMessageService: メッセージ処理エラー', error);
          callback([]);
        }
      });

      return unsubscribe;
    } catch (error: any) {
      console.error('FirestoreMessageService: メッセージ監視エラー', error);
      return () => {};
    }
  }

  // ユーザーの全フレンドとの最後のメッセージを取得
  async getLastMessagesForUser(userId: string, friendIds: string[]): Promise<Record<string, Message | null>> {
    const lastMessages: Record<string, Message | null> = {};
    
    try {
      console.log('FirestoreMessageService: 最後のメッセージ取得開始', { userId, friendIds });
      
      for (const friendId of friendIds) {
        try {
          const q = query(
            this.messagesCollection,
            where('senderId', 'in', [userId, friendId]),
            where('receiverId', 'in', [userId, friendId]),
            orderBy('timestamp', 'desc')
          );

          // 簡単な方法として、最新の1件を取得
          const snapshot = await new Promise((resolve, reject) => {
            const unsubscribe = onSnapshot(q, (snapshot) => {
              unsubscribe();
              resolve(snapshot);
            }, reject);
          });

          let lastMessage: Message | null = null;
          snapshot.forEach((doc) => {
            const data = doc.data();
            if ((data.senderId === userId && data.receiverId === friendId) ||
                (data.senderId === friendId && data.receiverId === userId)) {
              lastMessage = {
                id: doc.id,
                senderId: data.senderId,
                receiverId: data.receiverId,
                content: data.content,
                timestamp: data.timestamp.toMillis(),
                senderName: data.senderName,
                isRead: data.isRead
              };
            }
          });

          lastMessages[friendId] = lastMessage;
        } catch (error) {
          console.error(`フレンド ${friendId} のメッセージ取得エラー:`, error);
          lastMessages[friendId] = null;
        }
      }
    } catch (error) {
      console.error('FirestoreMessageService: メッセージ一括取得エラー', error);
    }
    
    return lastMessages;
  }
}

export const firestoreMessageService = new FirestoreMessageService();
