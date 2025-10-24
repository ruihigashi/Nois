import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { messageService, Message } from '../services/MessageService';
import ChatHeader from './ChatHeader';

export default function NotificationScreen() {
  const navigate = useNavigate();
  const { currentUser: user } = useAuth();
  const [notifications, setNotifications] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const unsubscribe = messageService.watchUnreadMessages(user.uid, (messages) => {
        // Group messages by sender
        const groupedMessages = messages.reduce((acc, message) => {
          if (!acc[message.senderId]) {
            acc[message.senderId] = [];
          }
          acc[message.senderId].push(message);
          return acc;
        }, {} as Record<string, Message[]>);

        // Get the latest message from each sender
        const latestMessages = Object.values(groupedMessages).map(group => {
          return group.sort((a, b) => b.timestamp - a.timestamp)[0];
        });

        setNotifications(latestMessages.sort((a, b) => b.timestamp - a.timestamp));
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleNotificationClick = async (notification: Message) => {
    // Mark messages from this sender as read
    const messagesToMark = notifications.filter(n => n.senderId === notification.senderId);
    const messageIds = messagesToMark.map(m => m.id);
    // This is not efficient, but for now we do it one by one
    for (const id of messageIds) {
        await messageService.markAsRead(id);
    }

    // Navigate to chat screen
    navigate(`/message?friendId=${notification.senderId}&friendName=${notification.senderName}`);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="h-screen max-h-screen w-screen max-w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-purple-900 flex flex-col overflow-hidden fixed inset-0">
      <ChatHeader title="Notifications" onBack={() => navigate(-1)} />

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center text-white/80">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center text-white/80">No new notifications.</div>
        ) : (
          <div className="space-y-3">
            {notifications.map(notification => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center space-x-3 cursor-pointer hover:bg-white/15 transition-all duration-200"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-white font-semibold">{notification.senderName}</h3>
                    <p className="text-xs text-white/60">{formatTime(notification.timestamp)}</p>
                  </div>
                  <p className="text-white/80 text-sm truncate">
                    {notification.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
