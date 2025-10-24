import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import Login from '../components/Login';
import PhoneAuth from '../components/PhoneAuth';
import EmailPassword from '../components/EmailPassword';
import SignUp from '../components/SignUp';
import QRScanner from '../components/QRScanner';
import MyQRCode from '../components/MyQRCode';
import Settings from '../components/Settings';
import Home from '../Home';
import Caller from '../components/Caller';
import Reception from '../components/Reception';
import FriendList from '../components/FriendList';
import MessageScreen from '../components/MessageScreen';
import CallScreen from '../components/CallScreen'; // 追加
import NotificationScreen from '../components/NotificationScreen'; // 追加
import App from '../App';
import Answer from '../Answer';

// Caller画面用のラッパーコンポーネント
function CallerPage() {
  return <App forcedRole="caller" />;
}

// Reception画面用のラッパーコンポーネント
function ReceptionPage() {
  return <App forcedRole="answerer" />;
}

// 認証が必要なルートの保護
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <img src="/app-icon.png" alt="Nois" className="w-16 h-16 object-contain" />
          </div>
          <p className="text-gray-600">読み込み中...</p>
        </div>
      </div>
    );
  }

  return currentUser ? <>{children}</> : <Navigate to="/" replace />;
}

import { WebRTCProvider } from '../contexts/WebRTCContext';

import MainLayout from '../components/MainLayout';

// ... (other imports)

function AppRoutes() {
  return (
    <Routes>
      {/* ログイン画面 */}
      <Route path="/" element={<Login />} />
      
      {/* 電話番号認証画面 */}
      <Route path="/phone-auth" element={<PhoneAuth />} />
      
      {/* メール・パスワード登録画面 */}
      <Route path="/email-password" element={<EmailPassword />} />
      
      {/* アカウント作成画面 */}
      <Route path="/signup" element={<SignUp />} />
      
      {/* 認証と共通レイアウトが必要な画面 */}
      <Route path="/home" element={<ProtectedRoute><MainLayout><Home /></MainLayout></ProtectedRoute>} />
      <Route path="/friends" element={<ProtectedRoute><MainLayout><FriendList /></MainLayout></ProtectedRoute>} />
      <Route path="/call-screen" element={<ProtectedRoute><MainLayout><CallScreen /></MainLayout></ProtectedRoute>} />
      <Route path="/message" element={<ProtectedRoute><MessageScreen /></ProtectedRoute>} />
      <Route path="/qr-scanner" element={<ProtectedRoute><QRScanner /></ProtectedRoute>} />
      <Route path="/my-qr-code" element={<ProtectedRoute><MyQRCode /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><MainLayout><Settings /></MainLayout></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationScreen /></ProtectedRoute>} />

      {/* 通話画面 (専用レイアウト) */}
      <Route path="/caller" element={<ProtectedRoute><CallerPage /></ProtectedRoute>} />
      <Route path="/reception" element={<ProtectedRoute><ReceptionPage /></ProtectedRoute>} />
      
      {/* デフォルトルート */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// ... (rest of the file)
export default function AppRoutesWithAuth() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <WebRTCProvider>
          <AppRoutes />
        </WebRTCProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}
