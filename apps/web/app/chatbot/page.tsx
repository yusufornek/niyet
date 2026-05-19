import { Suspense } from 'react';

import { PhoneShell } from '@/components/phone-shell';
import { Spinner } from '@/components/spinner';

import ChatbotClient from './chatbot-client';

export default function ChatbotPage() {
  return (
    <Suspense
      fallback={
        <PhoneShell title="Tasarruf Asistanı">
          <div className="flex h-64 items-center justify-center">
            <Spinner label="Yükleniyor" />
          </div>
        </PhoneShell>
      }
    >
      <ChatbotClient />
    </Suspense>
  );
}
