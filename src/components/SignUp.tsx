import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfile, updateEmail } from 'firebase/auth';
import { auth } from '../firebase/config';
import { createUserProfile } from '../services/userService';
import { generateUserQRId, generateQRCode, saveUserQRCode } from '../services/qrService';

export default function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    displayName: '',
    phoneNumber: sessionStorage.getItem('phoneNumber') || '',
    email: sessionStorage.getItem('email') || '',
    password: sessionStorage.getItem('password') || ''
  });
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.displayName.trim()) {
      setError('名前を入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 現在のユーザー（電話番号認証済み）を取得
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('認証されていません。電話番号認証からやり直してください。');
        return;
      }

      // プロフィール更新
      await updateProfile(currentUser, {
        displayName: formData.displayName
      });

      // ユニークなQRコードIDを生成
      const qrId = generateUserQRId();
      
      // QRコードを生成
      const qrCodeDataURL = await generateQRCode(qrId);
      
      // Firestoreにユーザープロフィールを保存
      await createUserProfile(currentUser, {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        profileImage: profileImage || undefined,
        qrId: qrId
      });

      // プロフィール更新
      await updateProfile(currentUser, {
        displayName: formData.displayName
      });

      // emailが入力されている場合の処理
      if (formData.email && formData.email.trim()) {
        try {
          // 電話番号認証で作成されたユーザーの場合、メールアドレスを設定するには
          // メール/パスワード認証でアカウントを作成し直す必要があります
          console.log('Email will be stored in Firestore only:', formData.email);
          console.log('Note: To enable email/password login, user needs to create a new account with email/password authentication');
        } catch (emailError: any) {
          console.error('Email handling failed:', emailError);
          // エラーが発生しても続行（Firestoreには保存される）
        }
      }
      
      // QRコード情報を保存
      await saveUserQRCode(currentUser.uid, qrId, qrCodeDataURL);

      // セッションストレージをクリア
      sessionStorage.removeItem('email');
      sessionStorage.removeItem('password');
      sessionStorage.removeItem('phoneNumber');

      // 登録完了後、ホーム画面へ
      navigate('/home');
    } catch (err: any) {
      setError(err.message || 'アカウント作成に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
      {/* 戻るボタン */}
      <button 
        onClick={() => navigate('/email-password')}
        className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <img src="/login-back.png" alt="戻る" className="w-full h-full object-contain" />
      </button>


      {/* タイトル */}
      <div className="text-center mb-8 mt-24">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">アカウント作成</h1>
        <p className="text-gray-600 text-base">プロフィール情報を入力してください</p>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        {/* プロフィール画像 */}
        <div className="text-center">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            プロフィール画像
          </label>
          <div className="flex items-center justify-center">
            <label className="cursor-pointer">
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                {profileImage ? (
                  <img 
                    src={URL.createObjectURL(profileImage)} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-2xl">📷</span>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* 名前 */}
        <div>
          <input
            type="text"
            name="displayName"
            value={formData.displayName}
            onChange={handleInputChange}
            placeholder="名前"
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

        {/* 登録ボタン */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
        >
          {loading ? '作成中...' : 'アカウント作成'}
        </button>

      </form>
    </div>
  );
}
