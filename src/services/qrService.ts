import { doc, setDoc, getDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import QRCode from 'qrcode';

// ユーザーのQRコードIDを生成
export const generateUserQRId = (): string => {
  // 8文字のランダムな英数字を生成
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// QRコードを生成
export const generateQRCode = async (qrId: string): Promise<string> => {
  try {
    const qrData = `nois://friend/${qrId}`;
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('QRコード生成エラー:', error);
    throw error;
  }
};

// ユーザーのQRコード情報をFirestoreに保存
export const saveUserQRCode = async (userId: string, qrId: string, qrCodeDataURL: string) => {
  try {
    await setDoc(doc(db, 'userQRCodes', qrId), {
      userId: userId,
      qrId: qrId,
      qrCodeDataURL: qrCodeDataURL,
      createdAt: new Date(),
      isActive: true
    });
  } catch (error) {
    console.error('QRコード保存エラー:', error);
    throw error;
  }
};

// QRコードIDからユーザー情報を取得
export const getUserByQRId = async (qrId: string) => {
  try {
    const qrDoc = await getDoc(doc(db, 'userQRCodes', qrId));
    if (!qrDoc.exists()) {
      throw new Error('QRコードが見つかりません');
    }

    const qrData = qrDoc.data();
    if (!qrData.isActive) {
      throw new Error('このQRコードは無効です');
    }

    // ユーザー情報を取得
    const userDoc = await getDoc(doc(db, 'users', qrData.userId));
    if (!userDoc.exists()) {
      throw new Error('ユーザーが見つかりません');
    }

    return {
      userId: qrData.userId,
      qrId: qrData.qrId,
      ...userDoc.data()
    };
  } catch (error) {
    console.error('ユーザー取得エラー:', error);
    throw error;
  }
};

// 友達関係を保存
export const addFriend = async (currentUserId: string, friendUserId: string) => {
  try {
    // 友達関係を双方向で保存
    await setDoc(doc(db, 'friendships', `${currentUserId}_${friendUserId}`), {
      userId1: currentUserId,
      userId2: friendUserId,
      createdAt: new Date(),
      status: 'accepted'
    });

    await setDoc(doc(db, 'friendships', `${friendUserId}_${currentUserId}`), {
      userId1: friendUserId,
      userId2: currentUserId,
      createdAt: new Date(),
      status: 'accepted'
    });
  } catch (error) {
    console.error('友達追加エラー:', error);
    throw error;
  }
};

// ユーザーの友達リストを取得
export const getFriendsList = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'friendships'),
      where('userId1', '==', userId),
      where('status', '==', 'accepted')
    );
    
    const querySnapshot = await getDocs(q);
    const friends = [];
    
    for (const docSnapshot of querySnapshot.docs) {
      const friendshipData = docSnapshot.data();
      const friendDoc = await getDoc(doc(db, 'users', friendshipData.userId2));
      if (friendDoc.exists()) {
        friends.push({
          id: friendshipData.userId2,
          ...friendDoc.data()
        });
      }
    }
    
    return friends;
  } catch (error) {
    console.error('友達リスト取得エラー:', error);
    throw error;
  }
};
