import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getUserByQRId, addFriend } from '../services/qrService';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function QRScanner() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [scannedUser, setScannedUser] = useState<any>(null);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [myQRId, setMyQRId] = useState<string>('');
  const [myProfileImage, setMyProfileImage] = useState<string>('');

  useEffect(() => {
    startCamera();
    fetchMyQRId();
    return () => {
      console.log("QRScanner cleanup: Stopping camera and interval.");
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      console.log("QRScanner cleanup: Interval ID is", scanIntervalRef.current);
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        console.log("QRScanner cleanup: Interval cleared.");
        scanIntervalRef.current = null;
      }
    };
  }, []);

  const fetchMyQRId = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setMyQRId(userData.qrId || '');
        setMyProfileImage(userData.profileImageUrl || '');
      }
    } catch (error) {
      console.error('QR ID取得エラー:', error);
    }
  };

  useEffect(() => {
    if (videoRef.current && isScanning) {
      startQRScanning();
    }
  }, [isScanning]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // 背面カメラを使用
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => {
          console.log('Video play interrupted:', err);
        });
        setIsScanning(true);
      }
    } catch (err) {
      console.error('カメラアクセスエラー:', err);
      setError('カメラにアクセスできません。カメラの許可を確認してください。');
    }
  };

  const startQRScanning = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }

      scanIntervalRef.current = setInterval(() => {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          console.log('QRコードスキャン中...');
        }
      }, 500);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopCamera();
    navigate('/friends');
  };

  const handleMyQRCode = () => {
    navigate('/my-qr-code');
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchError('検索IDを入力してください');
      return;
    }

    setSearchLoading(true);
    setSearchError('');
    setSearchResults([]);

    try {
      console.log('検索開始:', searchQuery.trim());
      console.log('現在のユーザー:', user?.uid);
      console.log('認証状態:', user ? '認証済み' : '未認証');
      
      // QR IDで検索
      const qrQuery = query(
        collection(db, 'userQRCodes'),
        where('qrId', '==', searchQuery.trim())
      );
      console.log('QR ID検索クエリ実行中...');
      const qrSnapshot = await getDocs(qrQuery);
      console.log('QR ID検索結果:', qrSnapshot.docs.length, '件');

      if (!qrSnapshot.empty) {
        const qrDoc = qrSnapshot.docs[0];
        const qrData = qrDoc.data();
        
        // ユーザー情報を取得
        const userDoc = await getDoc(doc(db, 'users', qrData.userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSearchResults([{
            userId: qrData.userId,
            qrId: qrData.qrId,
            ...userData
          }]);
        } else {
          setSearchError('ユーザーが見つかりません');
        }
      } else {
        // QR IDで見つからない場合、表示名で検索
        const userQuery = query(
          collection(db, 'users'),
          where('displayName', '>=', searchQuery.trim()),
          where('displayName', '<=', searchQuery.trim() + '\uf8ff')
        );
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const results = userSnapshot.docs.map(doc => ({
            userId: doc.id,
            ...doc.data()
          }));
          setSearchResults(results);
        } else {
          setSearchError('該当するユーザーが見つかりません');
        }
      }
    } catch (error: any) {
      console.error('検索エラー:', error);
      let errorMessage = '検索中にエラーが発生しました';
      
      if (error.code === 'permission-denied') {
        errorMessage = 'Firebaseの権限設定を確認してください。管理者にお問い合わせください。';
      } else if (error.code === 'unavailable') {
        errorMessage = 'ネットワークエラーです。接続を確認してください';
      } else if (error.code === 'unauthenticated') {
        errorMessage = '認証が必要です。ログインし直してください';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSearchError(errorMessage);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddFriendFromSearch = async (friendUserId: string) => {
    try {
      if (!user) return;
      
      if (user.uid === friendUserId) {
        setSearchError('自分自身を友達に追加することはできません');
        return;
      }
      
      await addFriend(user.uid, friendUserId);
      setSearchError('');
      setSearchResults([]);
      setSearchQuery('');
      setShowSearchModal(false);
      alert('友達を追加しました！');
    } catch (error: any) {
      console.error('友達追加エラー:', error);
      setSearchError(error.message || '友達追加に失敗しました');
    }
  };

  const handleQRCodeDetected = async (qrId: string) => {
    try {
      if (!user) return;
      
      // 自分のQRコードの場合は無視
      if (qrId === user.uid) {
        setError('自分のQRコードです');
        return;
      }

      // ユーザー情報を取得
      const userData = await getUserByQRId(qrId);
      setScannedUser(userData);
      setShowAddFriendModal(true);
      stopCamera();
    } catch (err: any) {
      setError(err.message || 'QRコードの読み取りに失敗しました');
    }
  };

  const handleAddFriend = async () => {
    try {
      if (!user || !scannedUser) return;
      
      // 自分自身の場合は追加しない
      if (user.uid === scannedUser.userId) {
        setError('自分自身を友達に追加することはできません');
        return;
      }
      
      await addFriend(user.uid, scannedUser.userId);
      setShowAddFriendModal(false);
      setScannedUser(null);
      setError('');
      navigate('/friends');
    } catch (err: any) {
      setError(err.message || '友達追加に失敗しました');
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* ヘッダー */}
      <div className="absolute top-0 left-0 z-10 p-4 text-white">
        <button 
          onClick={handleClose}
          className="w-12 h-12 flex items-center justify-center"
        >
          <span className="text-black text-3xl font-bold">×</span>
        </button>
      </div>

      {/* カメラプレビュー */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />
        
        {/* スキャンエリアのオーバーレイ */}
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm">
            {/* スキャン範囲の四角 */}
            <div className="w-full aspect-square max-w-64 border-2 border-white/50 bg-transparent relative mx-auto">
              {/* 四隅のコーナーブラケット */}
              <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-white"></div>
              <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 sm:border-t-4 border-r-2 sm:border-r-4 border-white"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 sm:border-b-4 border-l-2 sm:border-l-4 border-white"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-white"></div>
            </div>
          </div>
        </div>

        {/* エラーメッセージ */}
        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white px-3 py-2 rounded-lg text-sm sm:text-base max-w-xs mx-4 text-center">
            {error}
          </div>
        )}
      </div>

      {/* フッターコントロール */}
      <div className="bg-gray-800/90 backdrop-blur-sm p-3 sm:p-6 flex-shrink-0">
        {/* ボタンエリア */}
        <div className="flex justify-center items-center space-x-4 sm:space-x-8 mb-3 sm:mb-4">
          {/* マイQRコードボタン */}
          <button 
            onClick={handleMyQRCode}
            className="flex flex-col items-center space-y-1 sm:space-y-2 min-w-0 flex-1 max-w-24 sm:max-w-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" className="sm:w-6 sm:h-6" fill="white" viewBox="0 0 24 24">
                <path d="M3 3h7v7H3V3zm1 1v5h5V4H4zm7-1h7v7h-7V3zm1 1v5h5V4h-5zM3 11h7v7H3v-7zm1 1v5h5v-5H4zm7 0h7v7h-7v-7zm1 1v5h5v-5h-5z"/>
              </svg>
            </div>
            <span className="text-white text-xs sm:text-sm text-center leading-tight">マイQRコード</span>
          </button>

          {/* 検索ボタン */}
          <button 
            onClick={() => setShowSearchModal(true)}
            className="flex flex-col items-center space-y-1 sm:space-y-2 min-w-0 flex-1 max-w-24 sm:max-w-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" className="sm:w-6 sm:h-6" fill="white" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </div>
            <span className="text-white text-xs sm:text-sm text-center leading-tight">検索</span>
          </button>
        </div>
      </div>

      {/* キャンバス（QRコード検出用） */}
      <canvas ref={canvasRef} className="hidden" />

      {/* 友達追加モーダル */}
      {showAddFriendModal && scannedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddFriendModal(false)}>
          <div 
            className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ユーザー情報 */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-4">
                {scannedUser.profileImageUrl ? (
                  <img 
                    src={scannedUser.profileImageUrl} 
                    alt="プロフィール" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400 text-2xl">👤</span>
                )}
              </div>
              
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                {scannedUser.displayName}
              </h2>
              
              {scannedUser.email && (
                <p className="text-gray-600 text-sm">
                  {scannedUser.email}
                </p>
              )}
            </div>

            {/* アクションボタン */}
            <div className="space-y-3">
              <button 
                onClick={handleAddFriend}
                className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-3 px-4 rounded-xl hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200"
              >
                友達追加
              </button>
              <button 
                onClick={() => setShowAddFriendModal(false)}
                className="w-full bg-gray-200 text-gray-600 font-semibold py-3 px-4 rounded-xl hover:bg-gray-300 transition-all duration-200"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 検索モーダル */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSearchModal(false)}>
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">ユーザー検索</h2>
              <button 
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 自分のQR ID表示 */}
            {myQRId && (
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
                    {myProfileImage ? (
                      <img 
                        src={myProfileImage} 
                        alt="プロフィール" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 text-xl">👤</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-600 font-medium">あなたのユーザーID</p>
                    <p className="text-lg font-bold text-gray-800 font-mono">{myQRId}</p>
                  </div>
                </div>
              </div>
            )}

            {/* 検索フォーム */}
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="QR IDまたはユーザー名を入力"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
              
              <button
                onClick={handleSearch}
                disabled={searchLoading}
                className="w-full bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 text-white font-semibold py-3 px-4 rounded-lg hover:from-slate-800 hover:via-blue-800 hover:to-purple-800 transition-all duration-200 disabled:opacity-50"
              >
                {searchLoading ? '検索中...' : '検索'}
              </button>

              {/* エラーメッセージ */}
              {searchError && (
                <div className="text-red-500 text-sm text-center">
                  {searchError}
                </div>
              )}

              {/* 検索結果 */}
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-700">検索結果</h3>
                  {searchResults.map((result) => (
                    <div key={result.userId} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {result.profileImageUrl ? (
                          <img 
                            src={result.profileImageUrl} 
                            alt="プロフィール" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-lg">👤</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{result.displayName}</h4>
                        {result.qrId && (
                          <p className="text-gray-500 text-xs">ユーザーID: {result.qrId}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleAddFriendFromSearch(result.userId)}
                        className="w-8 h-8 flex items-center justify-center hover:opacity-80 transition-opacity"
                      >
                        <img src="/user-add.png" alt="追加" className="w-full h-full object-contain" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
