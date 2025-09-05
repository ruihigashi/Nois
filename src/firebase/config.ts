import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase設定
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyA-boeCmMqY_NOunR4MmxVF4iSvkc7PRmk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nois-app-add5a.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nois-app-add5a",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nois-app-add5a.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "908384895475",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:908384895475:web:54c4f2f3ba537fa2219286",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-NP62JFLCLV"
};

// Firebase初期化
const app = initializeApp(firebaseConfig);

// Authentication初期化
export const auth = getAuth(app);

// Firestore初期化
export const db = getFirestore(app);

// Storage初期化
export const storage = getStorage(app);

export default app;
