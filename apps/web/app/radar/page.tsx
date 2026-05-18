'use client';

import { PhoneShell } from '@/components/phone-shell';
import { RadarContent } from '@/components/radar-content';

export default function RadarPage() {
  return (
    <PhoneShell title="Tasarruf Radarı">
      <RadarContent />
    </PhoneShell>
  );
}
