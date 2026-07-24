'use client';

import { DropZone } from './drop-zone';
import { useSettings } from '@/hooks/use-settings';

export function StagingArea() {
  const { settings } = useSettings();
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <DropZone label={settings.courierLabel} />
      <DropZone label={settings.buyerLabel} />
    </section>
  );
}
