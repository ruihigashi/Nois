import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { generateUserQRId, generateQRCode, saveUserQRCode } from '../services/qrService';

export default function MyQRCode() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>('');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserQRCode = async () => {
      if (user) {
        try {
          console.log('ユーザーID:', user.uid);
          
          // ユーザープロフィールを取得
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          console.log('ユーザードキュメント存在:', userDoc.exists());
          
          if (userDoc.exists()) {
            const profileData = userDoc.data();
            console.log('プロフィールデータ:', profileData);
            setUserProfile(profileData);
            
            // QRコードデータを取得
            if (profileData.qrId) {
              console.log('QR ID:', profileData.qrId);
              try {
                const qrDoc = await getDoc(doc(db, 'userQRCodes', profileData.qrId));
                console.log('QRドキュメント存在:', qrDoc.exists());
                
                if (qrDoc.exists()) {
                  const qrData = qrDoc.data();
                  console.log('QRデータ:', qrData);
                  setQrCodeDataURL(qrData.qrCodeDataURL);
                } else {
                  console.log('QRドキュメントが見つかりません。新しく生成します。');
                  await generateAndSaveQRCode(user.uid, profileData.qrId);
                }
              } catch (permissionError) {
                console.log('権限エラーが発生しました。QRコードを新しく生成します。', permissionError);
                await generateAndSaveQRCode(user.uid, profileData.qrId);
              }
            } else {
              console.log('プロフィールにqrIdがありません。新しく生成します。');
              const newQrId = generateUserQRId();
              await setDoc(doc(db, 'users', user.uid), {
                ...profileData,
                qrId: newQrId
              }, { merge: true });
              await generateAndSaveQRCode(user.uid, newQrId);
            }
          } else {
            console.log('ユーザードキュメントが見つかりません');
          }
        } catch (error) {
          console.error('QRコード取得エラー:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchUserQRCode();
  }, [user]);

  const generateAndSaveQRCode = async (userId: string, qrId: string) => {
    try {
      console.log('QRコードを生成中...');
      const qrCodeDataURL = await generateQRCode(qrId);
      console.log('QRコード生成完了');
      
      // 直接表示（Firestoreへの保存はスキップ）
      setQrCodeDataURL(qrCodeDataURL);
      
      // バックグラウンドでFirestoreに保存を試行（失敗しても表示は継続）
      try {
        await saveUserQRCode(userId, qrId, qrCodeDataURL);
        console.log('QRコード保存完了');
      } catch (saveError) {
        console.log('QRコード保存に失敗しましたが、表示は継続します:', saveError);
      }
    } catch (error) {
      console.error('QRコード生成エラー:', error);
    }
  };

  const handleClose = () => {
    navigate('/qr-scanner');
  };



  if (loading) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <img src="/app-icon.png" alt="Nois" className="w-16 h-16 object-contain" />
          </div>
          <p className="text-white">読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 z-10 p-4 text-white">
        <button 
          onClick={handleClose}
          className="w-12 h-12 flex items-center justify-center hover:opacity-80 transition-opacity"
        >
          <img src="/back-icon.png" alt="戻る" className="w-8 h-8 object-contain" />
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* 説明文 */}
        <div className="text-center mb-8">
          <p className="text-white/80 text-sm">友達にこのQRコードを見せてください！</p>
        </div>

        {/* QRコード */}
        <div className="bg-white p-6 rounded-2xl shadow-2xl mb-8">
          {qrCodeDataURL ? (
            <img 
              src={qrCodeDataURL} 
              alt="マイQRコード" 
              className="w-64 h-64"
            />
          ) : (
            <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
              <p className="text-gray-500">QRコードが見つかりません</p>
            </div>
          )}
        </div>


      </div>

    </div>
  );
}
