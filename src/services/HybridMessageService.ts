import { firestoreMessageService, Message as FirestoreMessage } from './FirestoreMessageService';
import { localMessageService, Message as LocalMessage } from './LocalMessageService';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: number;
  senderName: string;
  isRead: boolean;
}

class HybridMessageService {
  private useFirestore = true; // Firestoreを優先使用

  // メッセージを送信
  async sendMessage(senderId: string, senderName: string, receiverId: string, content: string): Promise<string> {
    console.log('HybridMessageService: メッセージ送信開始', { senderId, senderName, receiverId, content });
    
    try {
      if (this.useFirestore) {
        console.log('HybridMessageService: Firestoreで送信を試行');
        const messageId = await firestoreMessageService.sendMessage(senderId, senderName, receiverId, content);
        
        // Firestoreが成功した場合、ローカルにも保存（バックアップ）
        try {
          await localMessageService.sendMessage(senderId, senderName, receiverId, content);
          console.log('HybridMessageService: ローカルバックアップも完了');
        } catch (localError) {
          console.warn('HybridMessageService: ローカルバックアップ失敗（無視）', localError);
        }
        
        return messageId;
      } else {
        throw new Error('Firestore無効');
      }
    } catch (firestoreError) {
      console.warn('HybridMessageService: Firestore送信失敗、ローカルにフォールバック', firestoreError);
      
      try {
        const messageId = await localMessageService.sendMessage(senderId, senderName, receiverId, content);
        console.log('HybridMessageService: ローカル送信成功', messageId);
        return messageId;
      } catch (localError) {
        console.error('HybridMessageService: ローカル送信も失敗', localError);
        throw localError;
      }
    }
  }

  // ユーザー間のメッセージを監視
  watchMessages(userId1: string, userId2: string, callback: (messages: Message[]) => void) {
    console.log('HybridMessageService: メッセージ監視開始', { userId1, userId2 });
    
    if (this.useFirestore) {
      console.log('HybridMessageService: Firestoreで監視を開始');
      return firestoreMessageService.watchMessages(userId1, userId2, callback);
    } else {
      console.log('HybridMessageService: ローカルで監視を開始');
      return localMessageService.watchMessages(userId1, userId2, callback);
    }
  }

  // ユーザーの全フレンドとの最後のメッセージを取得
  async getLastMessagesForUser(userId: string, friendIds: string[]): Promise<Record<string, Message | null>> {
    console.log('HybridMessageService: 最後のメッセージ取得開始', { userId, friendIds });
    
    if (this.useFirestore) {
      try {
        return await firestoreMessageService.getLastMessagesForUser(userId, friendIds);
      } catch (error) {
        console.warn('HybridMessageService: Firestore取得失敗、ローカルにフォールバック', error);
        return await localMessageService.getLastMessagesForUser(userId, friendIds);
      }
    } else {
      return await localMessageService.getLastMessagesForUser(userId, friendIds);
    }
  }

  // メッセージを既読にする
  async markAsRead(messageId: string) {
    console.log('HybridMessageService: 既読設定', messageId);
    
    if (this.useFirestore) {
      try {
        // Firestoreの既読設定（実装が必要な場合）
        console.log('HybridMessageService: Firestore既読設定（未実装）');
      } catch (error) {
        console.warn('HybridMessageService: Firestore既読設定失敗', error);
      }
    }
    
    // ローカルでも既読設定
    try {
      await localMessageService.markAsRead(messageId);
    } catch (error) {
      console.warn('HybridMessageService: ローカル既読設定失敗', error);
    }
  }

  // Firestoreの使用を無効化（テスト用）
  disableFirestore() {
    console.log('HybridMessageService: Firestoreを無効化、ローカルのみ使用');
    this.useFirestore = false;
  }

  // Firestoreの使用を有効化
  enableFirestore() {
    console.log('HybridMessageService: Firestoreを有効化');
    this.useFirestore = true;
  }
}

export const hybridMessageService = new HybridMessageService();
