import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { auth } from '../firebase/config';

export default function PhoneAuth() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phonePart1, setPhonePart1] = useState('');
  const [phonePart2, setPhonePart2] = useState('');
  const [phonePart3, setPhonePart3] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', '']);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const showToast = (message: string) => {
    // 簡単なトースト表示（後で改善可能）
    console.log('Toast:', message);
  };

  // 電話番号の部分を結合
  const getFullPhoneNumber = () => {
    return phonePart1 + phonePart2 + phonePart3;
  };

  // 電話番号の部分をクリア
  const clearPhoneNumber = () => {
    setPhonePart1('');
    setPhonePart2('');
    setPhonePart3('');
  };

  // 電話番号の部分を更新
  const updatePhoneNumber = (part: number, value: string) => {
    if (part === 1) {
      setPhonePart1(value);
      if (value.length === 3) {
        document.getElementById('phone-part-2')?.focus();
      }
    } else if (part === 2) {
      setPhonePart2(value);
      if (value.length === 4) {
        document.getElementById('phone-part-3')?.focus();
      }
    } else if (part === 3) {
      setPhonePart3(value);
    }
  };

  // 認証コードの桁を更新
  const updateCodeDigit = (index: number, value: string) => {
    const newDigits = [...codeDigits];
    newDigits[index] = value;
    setCodeDigits(newDigits);
    
    // 認証コード全体を更新
    const fullCode = newDigits.join('');
    setVerificationCode(fullCode);
    
    // 次のフィールドにフォーカス
    if (value && index < 5) {
      document.getElementById(`code-digit-${index + 1}`)?.focus();
    }
  };

  // 認証コードをクリア
  const clearCode = () => {
    setCodeDigits(['', '', '', '', '', '']);
    setVerificationCode('');
  };

  const handleSendCode = async () => {
    const fullPhoneNumber = getFullPhoneNumber();
    if (!fullPhoneNumber) {
      setError('電話番号を入力してください');
      return;
    }

    // 電話番号フォーマットの正規化
    let formattedPhoneNumber = fullPhoneNumber;
    if (!fullPhoneNumber.startsWith('+')) {
      // 日本の電話番号の場合
      if (fullPhoneNumber.startsWith('090') || fullPhoneNumber.startsWith('080') || fullPhoneNumber.startsWith('070')) {
        formattedPhoneNumber = '+81' + fullPhoneNumber.substring(1);
      } else if (fullPhoneNumber.startsWith('0')) {
        formattedPhoneNumber = '+81' + fullPhoneNumber.substring(1);
      } else {
        formattedPhoneNumber = '+81' + fullPhoneNumber;
      }
    }

    setLoading(true);
    setError('');

    // 開発用: テスト電話番号の場合はSMS送信をスキップ
    if (formattedPhoneNumber === '08091433468' || formattedPhoneNumber === '+818091433468') {
      console.log('開発用: テスト電話番号を検出しました');
      sessionStorage.setItem('phoneNumber', formattedPhoneNumber);
      sessionStorage.setItem('testMode', 'true');
      setIsCodeSent(true);
      showToast('テストモード: 認証コードは 123456 です');
      setLoading(false);
      return;
    }

    try {
      // reCAPTCHA設定を改善
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          console.log('reCAPTCHA solved');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          setError('reCAPTCHAが期限切れです。再試行してください。');
        },
        'error-callback': () => {
          console.log('reCAPTCHA error');
          setError('reCAPTCHA認証に失敗しました。');
        }
      });

      console.log('Sending SMS to:', formattedPhoneNumber);
      
      // 電話番号にSMS送信
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhoneNumber, recaptchaVerifier);
      
      // 確認結果と電話番号をセッションストレージに保存
      sessionStorage.setItem('confirmationResult', JSON.stringify(confirmationResult));
      sessionStorage.setItem('phoneNumber', formattedPhoneNumber);
      setIsCodeSent(true);
      showToast('認証コードを送信しました');
    } catch (err: any) {
      console.error('SMS送信エラー:', err);
      let errorMessage = 'SMS送信に失敗しました';
      
      if (err.code === 'auth/invalid-phone-number') {
        errorMessage = '無効な電話番号です';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'リクエストが多すぎます。しばらく待ってから再試行してください';
      } else if (err.code === 'auth/captcha-check-failed') {
        errorMessage = 'reCAPTCHA認証に失敗しました';
      } else if (err.code === 'auth/invalid-app-credential') {
        errorMessage = 'Firebase設定に問題があります。管理者にお問い合わせください';
      } else if (err.code === 'auth/missing-phone-number') {
        errorMessage = '電話番号が入力されていません';
      } else if (err.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS送信の上限に達しました。しばらく待ってから再試行してください';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode) {
      setError('認証コードを入力してください');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 開発用: テストモードの場合は認証コードをスキップ
      if (sessionStorage.getItem('testMode') === 'true') {
                    if (verificationCode === '123456') {
              console.log('開発用: テスト認証コードが正しいです');
              navigate('/email-password');
              return;
        } else {
          setError('テスト認証コードは 123456 です');
          setLoading(false);
          return;
        }
      }

      const confirmationResult = JSON.parse(sessionStorage.getItem('confirmationResult') || '');
      await confirmationResult.confirm(verificationCode);
      
                // 認証成功後、メール・パスワード登録画面へ
          navigate('/email-password');
    } catch (err: any) {
      console.error('認証コード確認エラー:', err);
      let errorMessage = '認証コードが正しくありません';
      
      if (err.code === 'auth/invalid-verification-code') {
        errorMessage = '無効な認証コードです';
      } else if (err.code === 'auth/code-expired') {
        errorMessage = '認証コードの有効期限が切れました';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 relative">
      {/* 戻るボタン */}
      <button 
        onClick={() => navigate('/')}
        className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 hover:opacity-80 transition-opacity cursor-pointer"
      >
        <img src="/login-back.png" alt="戻る" className="w-full h-full object-contain" />
      </button>

      {/* 説明文 */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {isCodeSent ? '認証コードを入力' : 'この端末の電話番号を入力'}
        </h2>
        <p className="text-gray-600 text-base">
          {isCodeSent 
            ? 'SMSで送信された6桁のコードを入力してください' 
            : '電話番号を入力して送信ボタンをタップしてください'
          }
        </p>
      </div>

      {/* フォーム */}
      <div className="w-full max-w-sm space-y-4">
        {!isCodeSent ? (
          <div>
            <div className="flex gap-2 items-center">
              <div className="relative flex-1">
                <input
                  id="phone-part-1"
                  type="tel"
                  value={phonePart1}
                  onChange={(e) => updatePhoneNumber(1, e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="090"
                  maxLength={3}
                  className="w-full px-3 py-3 text-center border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
                />
              </div>
              <span className="text-gray-400 text-xl">-</span>
              <div className="relative flex-1">
                <input
                  id="phone-part-2"
                  type="tel"
                  value={phonePart2}
                  onChange={(e) => updatePhoneNumber(2, e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  maxLength={4}
                  className="w-full px-3 py-3 text-center border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
                />
              </div>
              <span className="text-gray-400 text-xl">-</span>
              <div className="relative flex-1">
                <input
                  id="phone-part-3"
                  type="tel"
                  value={phonePart3}
                  onChange={(e) => updatePhoneNumber(3, e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="5678"
                  maxLength={4}
                  className="w-full px-3 py-3 text-center border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
                />
              </div>
              {(phonePart1 || phonePart2 || phonePart3) && (
                <button
                  onClick={clearPhoneNumber}
                  className="ml-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✖
                </button>
              )}
            </div>
            <button
              onClick={handleSendCode}
              disabled={loading}
              className="w-full mt-40 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? '送信中...' : '認証コードを送信'}
            </button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2 items-center justify-center">
              {codeDigits.map((digit, index) => (
                <div key={index} className="relative">
                  <input
                    id={`code-digit-${index}`}
                    type="text"
                    value={digit}
                    onChange={(e) => updateCodeDigit(index, e.target.value.replace(/\D/g, '').slice(0, 1))}
                    maxLength={1}
                    className="w-12 h-12 text-center border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xl font-mono"
                    style={{
                      borderBottom: digit ? '2px solid #000' : '2px solid #d1d5db'
                    }}
                  />
                </div>
              ))}
              {verificationCode && (
                <button
                  onClick={clearCode}
                  className="ml-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✖
                </button>
              )}
            </div>
            <button
              onClick={handleVerifyCode}
              disabled={loading}
              className="w-full mt-40 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-4 px-6 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {loading ? '認証中...' : '認証コードを確認'}
            </button>
          </div>
        )}

        {/* エラーメッセージ */}
        {error && (
          <div className="text-red-500 text-sm text-center mt-2">
            {error}
          </div>
        )}

      </div>

      {/* reCAPTCHAコンテナ */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
