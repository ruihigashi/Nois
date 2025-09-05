import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase/config";

export default function Login() {
  const navigate = useNavigate();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLoginClick = () => {
    setShowLoginForm(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home');
    } catch (error: any) {
      console.error('ログインエラー:', error);
      if (error.code === 'auth/user-not-found') {
        setError('このメールアドレスは登録されていません');
      } else if (error.code === 'auth/wrong-password') {
        setError('パスワードが正しくありません');
      } else if (error.code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません');
      } else {
        setError('ログインに失敗しました。もう一度お試しください');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    // 新規登録処理 - 電話番号認証画面へ
    navigate('/phone-auth');
  };

  const handleBack = () => {
    setShowLoginForm(false);
    setEmail("");
    setPassword("");
    setError("");
  };

  if (showLoginForm) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
        {/* 戻るボタン */}
        <button 
          onClick={handleBack}
          className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <img src="/login-back.png" alt="戻る" className="w-full h-full object-contain" />
        </button>

        {/* ヘッダー */}
        <div className="w-full max-w-sm mb-4">
          <div className="flex justify-center">
            <img src="/app-icon2.png" alt="ログイン" className="h-20 object-contain" />
          </div>
        </div>

        {/* ログインフォーム */}
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-3">
          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* メールアドレス入力 */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="メールアドレスを入力"
              required
            />
          </div>

          {/* パスワード入力 */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-16"
              placeholder="パスワードを入力"
              required
            />
          </div>

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      {/* ロゴ */}
      <div className="mb-8">
        <div className="w-20 h-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <img src="/app-icon.png" alt="Nois" className="w-16 h-16 object-contain" />
        </div>
      </div>

      {/* ウェルカムメッセージ */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Noisへようこそ</h1>
        <p className="text-gray-600 text-base">無料の音声・ビデオ通話を楽しもう!</p>
      </div>

      {/* アクションボタン */}
      <div className="w-full max-w-sm space-y-4">
        {/* ログインボタン */}
        <button 
          onClick={handleLoginClick}
          className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          ログイン
        </button>

        {/* 新規登録ボタン */}
        <button 
          onClick={handleSignUp}
          className="w-full bg-white text-gray-800 font-semibold py-4 px-6 rounded-xl border-2 border-gray-800 hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          新規登録
        </button>
      </div>
    </div>
  );
}
