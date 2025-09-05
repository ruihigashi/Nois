import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmailPassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // メールアドレスとパスワードをセッションストレージに保存
      sessionStorage.setItem('email', formData.email);
      sessionStorage.setItem('password', formData.password);
      
      // プロフィール作成画面へ
      navigate('/signup');
    } catch (err: any) {
      setError(err.message || '登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
      {/* 戻るボタン */}
      <button 
        onClick={() => navigate('/phone-auth')}
        className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <img src="/login-back.png" alt="戻る" className="w-full h-full object-contain" />
      </button>

      {/* タイトル */}
      <div className="text-center mb-8 mt-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">アカウント情報</h1>
        <p className="text-gray-600 text-base">メールアドレスとパスワードを入力してください</p>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {/* メールアドレス */}
        <div>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="メールアドレス"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* パスワード */}
        <div>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="パスワード（6文字以上）"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* パスワード確認 */}
        <div>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="パスワード確認"
            required
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="text-red-500 text-sm text-center">
            {error}
          </div>
        )}

        {/* 次へボタン */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? '処理中...' : '次へ'}
        </button>

      </form>
    </div>
  );
}
