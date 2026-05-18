'use client';

import { PhoneShell } from '@/components/phone-shell';
import { GoalsContent } from '@/components/goals-content';

export default function GoalsPage() {
  return (
    <PhoneShell title="Hedefler">
      <GoalsContent />
    </PhoneShell>
  );
}
