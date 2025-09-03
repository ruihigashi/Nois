import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from '../Home';
import Caller from '../components/Caller';
import Reception from '../components/Reception';
import FriendList from '../components/FriendList';
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

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ホーム画面 */}
        <Route path="/" element={<Home />} />
        
        {/* Caller画面 */}
        <Route path="/caller" element={<CallerPage />} />
        
        {/* Reception画面 */}
        <Route path="/reception" element={<ReceptionPage />} />
        
        {/* FriendList画面 */}
        <Route path="/friends" element={<FriendList />} />
        
        {/* デフォルトルート（存在しないパスの場合はホームにリダイレクト） */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
