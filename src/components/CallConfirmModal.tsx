import React from 'react';

interface CallConfirmModalProps {
  friendName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CallConfirmModal({ friendName, onConfirm, onCancel }: CallConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 max-w-sm w-full mx-auto shadow-2xl border border-blue-300/30 text-center">
        <p className="text-white/80 text-lg mb-6">{friendName}さんに電話をかけますか？</p>
        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            いいえ
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
          >
            はい
          </button>
        </div>
      </div>
    </div>
  );
}
