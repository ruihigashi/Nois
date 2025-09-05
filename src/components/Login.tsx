import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, storage } from "../firebase/config";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { createUserProfile } from "../services/userService";
import { generateUserQRId, generateQRCode, saveUserQRCode } from "../services/qrService";

export default function Login() {
  const navigate = useNavigate();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showSignUpForm, setShowSignUpForm] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleLoginClick = () => {
    setShowLoginForm(true);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log('ログイン試行:', { email, passwordLength: password.length });
      await signInWithEmailAndPassword(auth, email, password);
      console.log('ログイン成功');
    navigate('/home');
    } catch (error: any) {
      console.error('ログインエラー:', error);
      if (error.code === 'auth/user-not-found') {
        setError('このメールアドレスは登録されていません');
      } else if (error.code === 'auth/wrong-password') {
        setError('パスワードが正しくありません');
      } else if (error.code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません');
      } else if (error.code === 'auth/invalid-credential') {
        setError('メールアドレスまたはパスワードが正しくありません');
      } else if (error.code === 'auth/too-many-requests') {
        setError('ログイン試行回数が多すぎます。しばらく待ってから再試行してください');
      } else if (error.code === 'auth/network-request-failed') {
        setError('ネットワークエラーです。接続を確認してください');
      } else {
        setError('ログインに失敗しました。メールアドレスとパスワードを確認してください');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowLoginForm(false);
    setEmail("");
    setPassword("");
    setError("");
  };

  const handleSignUpClick = () => {
    setShowSignUpForm(true);
    setShowLoginForm(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfileImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('ユーザーが見つかりません');
      }

      // プロフィール画像をアップロード
      let profileImageUrl = '';
      if (profileImageFile) {
        const imageRef = ref(storage, `profile-images/${user.uid}`);
        await uploadBytes(imageRef, profileImageFile);
        profileImageUrl = await getDownloadURL(imageRef);
      }

      // プロフィール更新
      await updateProfile(user, {
        displayName: displayName
      });

      // QR ID生成
      const qrId = generateUserQRId();
      const qrCodeDataURL = await generateQRCode(qrId);

      // ユーザープロフィール作成
      await createUserProfile(user, {
        displayName: displayName,
        phoneNumber: phoneNumber,
        qrId: qrId
      });

      // QRコード情報を保存
      await saveUserQRCode(user.uid, qrId, qrCodeDataURL);

      // プロフィール画像URLをFirestoreに保存
      if (profileImageUrl) {
        const { doc, updateDoc } = await import('firebase/firestore');
        const { db } = await import('../firebase/config');
        await updateDoc(doc(db, 'users', user.uid), {
          profileImageUrl: profileImageUrl,
          updatedAt: new Date()
        });
      }

      console.log('プロフィール設定完了');
      navigate('/home');
    } catch (error: any) {
      console.error('プロフィール設定エラー:', error);
      setError('プロフィール設定に失敗しました: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      console.log('新規登録試行:', { email });
      
      // メール/パスワードでアカウント作成
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      console.log('新規登録成功');
      setShowSignUpForm(false);
      setShowProfileSetup(true);
    } catch (error: any) {
      console.error('新規登録エラー:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('このメールアドレスは既に使用されています');
      } else if (error.code === 'auth/invalid-email') {
        setError('メールアドレスの形式が正しくありません');
      } else if (error.code === 'auth/weak-password') {
        setError('パスワードは6文字以上で入力してください');
      } else {
        setError('アカウント作成に失敗しました: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };


  if (showProfileSetup) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <img src="/app-icon2.png" alt="Nois" className="h-20 mx-auto" />
        </div>

        {/* プロフィール設定フォーム */}
        <form onSubmit={handleProfileSetup} className="w-full max-w-sm space-y-4">
          {/* プロフィール画像 */}
          <div className="text-center">
            <label htmlFor="profileImage" className="block text-sm font-medium text-gray-700 mb-2">
              プロフィール画像
            </label>
            <div className="flex flex-col items-center space-y-3">
              <div 
                className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-300 transition-colors relative group"
                onClick={() => document.getElementById('profileImage')?.click()}
              >
                {profileImagePreview ? (
                  <img
                    src={profileImagePreview}
                    alt="プロフィールプレビュー"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center">
                    <img 
                      src="/upload-icon.png" 
                      alt="アップロード" 
                      className="w-8 h-10 opacity-50 group-hover:opacity-70 transition-opacity"
                    />
                  </div>
                )}
                {/* ホバー時のオーバーレイ */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-full flex items-center justify-center transition-all">
                  <img 
                    src="/upload-icon.png" 
                    alt="アップロード" 
                    className="w-8 h-10 opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                </div>
              </div>
              <input
                type="file"
                id="profileImage"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 表示名入力 */}
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
              ユーザーネーム
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ユーザーネームを入力"
              required
            />
          </div>

          {/* 電話番号入力 */}
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
              電話番号（任意）
            </label>
            <input
              type="tel"
              id="phoneNumber"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="電話番号を入力（例: 090-1234-5678）"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="text-red-500 text-sm text-center">
              {error}
            </div>
          )}

          {/* 設定完了ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '設定中...' : '設定完了'}
          </button>
        </form>
      </div>
    );
  }

  if (showSignUpForm) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
        {/* 戻るボタン */}
        <button
          onClick={() => {
            setShowSignUpForm(false);
            setEmail("");
            setPassword("");
            setDisplayName("");
            setError("");
          }}
          className="absolute top-4 left-4 z-10"
        >
          <img src="/login-back.png" alt="戻る" className="w-8 h-8" />
        </button>

        {/* ヘッダー */}
        <div className="text-center mb-8">
          <img src="/app-icon2.png" alt="Nois" className="h-20 mx-auto mb-4" />
        </div>

        {/* 新規登録フォーム */}
        <form onSubmit={handleSignUp} className="w-full max-w-sm space-y-3">
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
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-16"
                placeholder="パスワードを入力"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded p-2 mb-16"
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
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
            className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '登録中...' : 'アカウント作成'}
          </button>
        </form>
      </div>
    );
  }


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
            <div className="flex items-center gap-2">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-16"
                placeholder="パスワードを入力"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded p-2 mb-16"
              >
                {showPassword ? (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                  </svg>
                )}
              </button>
            </div>
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
          onClick={handleSignUpClick}
          className="w-full bg-white text-gray-800 font-semibold py-4 px-6 rounded-xl border-2 border-gray-800 hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          新規登録
        </button>
      </div>
    </div>
  );
}
