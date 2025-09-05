import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL 
} from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { User } from 'firebase/auth';

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  qrId?: string;
  createdAt: any;
  updatedAt: any;
}

// ユーザープロフィールをFirestoreに保存
export const createUserProfile = async (
  user: User, 
  additionalData: {
    displayName: string;
    phoneNumber?: string;
    profileImage?: File;
    qrId?: string;
  }
): Promise<UserProfile> => {
  try {
    let profileImageUrl = '';

    // プロフィール画像をアップロード
    if (additionalData.profileImage) {
      profileImageUrl = await uploadProfileImage(user.uid, additionalData.profileImage);
    }

    // ユーザープロフィールデータ
    const userProfile: any = {
      uid: user.uid,
      displayName: additionalData.displayName,
      phoneNumber: additionalData.phoneNumber || user.phoneNumber || '',
      profileImageUrl,
      qrId: additionalData.qrId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // emailが存在し、空でない場合のみ追加
    if (user.email && user.email.trim() !== '') {
      userProfile.email = user.email;
    }

    // Firestoreに保存
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, userProfile);

    return userProfile;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

// プロフィール画像をアップロード
export const uploadProfileImage = async (uid: string, imageFile: File): Promise<string> => {
  try {
    const imageRef = ref(storage, `profile-images/${uid}`);
    const snapshot = await uploadBytes(imageRef, imageFile);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading profile image:', error);
    throw error;
  }
};

// ユーザープロフィールを取得
export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserProfile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// ユーザープロフィールを更新
export const updateUserProfile = async (
  uid: string, 
  updateData: Partial<UserProfile>
): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};
