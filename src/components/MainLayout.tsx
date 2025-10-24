import React, { ReactNode, useContext, useEffect, useState } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import Footer from './Footer';
import IncomingCallModal from './IncomingCallModal';
import { AuthContext } from '../contexts/AuthContext';
import { messageService } from '../services/MessageService';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { incomingCall, answerCall, rejectCall } = useWebRTC();
  const authContext = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (authContext?.currentUser) {
      const unsubscribe = messageService.watchUnreadMessages(
        authContext.currentUser.uid,
        (messages) => {
          setUnreadCount(messages.length);
        }
      );

      return () => unsubscribe();
    }
  }, [authContext?.currentUser]);

  return (
    <div className="h-screen max-h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      
      <Footer unreadCount={unreadCount} />

      {incomingCall && (
        <IncomingCallModal
          incomingCall={incomingCall}
          onAccept={answerCall}
          onReject={rejectCall}
        />
      )}
    </div>
  );
}
