import React, { ReactNode } from 'react';
import { useWebRTC } from '../contexts/WebRTCContext';
import Footer from './Footer';
import IncomingCallModal from './IncomingCallModal';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const { incomingCall, answerCall, rejectCall } = useWebRTC();

  return (
    <div className="h-screen max-h-screen flex flex-col">
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      
      <Footer />

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
