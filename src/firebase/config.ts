import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import { getMessaging } from 'firebase/messaging';

// Firebase設定
const firebaseConfig = {
  apiKey: "AIzaSyA-boeCmMqY_NOunR4MmxVF4iSvkc7PRmk",
  authDomain: "nois-app-add5a.firebaseapp.com",
  projectId: "nois-app-add5a",
  storageBucket: "nois-app-add5a.firebasestorage.app",
  messagingSenderId: "908384895475",
  appId: "1:908384895475:web:54c4f2f3ba537fa2219286",
  measurementId: "G-NP62JFLCLV",
  databaseURL: "https://nois-app-add5a-default-rtdb.firebaseio.com/"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Authentication初期化
export const auth = getAuth(app);

// Firestore初期化
export const db = getFirestore(app);

// Storage初期化
export const storage = getStorage(app);

// Realtime Database初期化
export const database = getDatabase(app);

// Messaging初期化
export const messaging = getMessaging(app);

export default app;
