import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, messaging } from '../firebase/config';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({ currentUser: null, loading: true, logout: async () => {} });

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (currentUser) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            const VAPID_KEY = "BKt6rg6Oug1uCxq7k_TSMilGTUzoDfYXV5lleGpcTIJoRvVbcitD9uBXa35pJ4bJ9vkBifsyZudjsp69Lj-2N6s"; // TODO: Firebaseコンソールで取得したVAPIDキーに置き換えてください
            const token = await getToken(messaging, { vapidKey: VAPID_KEY });
            if (token) {
              await setDoc(doc(db, "fcmTokens", currentUser.uid), { token });
            } else {
              console.log('No registration token available. Request permission to generate one.');
            }
          }
        } catch (error) {
          console.error('An error occurred while retrieving token. ', error);
        }
      };

      requestPermission();
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('Message received. ', payload);
      // TODO: 通知を表示する処理を実装する
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('ログアウトエラー:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
