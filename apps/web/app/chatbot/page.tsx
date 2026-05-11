import { Suspense } from 'react';

import { PhoneShell } from '@/components/phone-shell';

import ChatbotClient from './chatbot-client';

export default function ChatbotPage() {
  return (
    <Suspense
      fallback={
        <PhoneShell title="Tasarruf Asistanı">
          <div className="ny-card h-32 animate-pulse" />
        </PhoneShell>
      }
    >
      <ChatbotClient />
    </Suspense>
  );
}
