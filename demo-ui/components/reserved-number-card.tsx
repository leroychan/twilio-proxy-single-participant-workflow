'use client';

import { useTranslation } from 'react-i18next';
import type { ReservedNumber } from '@/lib/mock-reserved';
import type { CardStyle } from '@/lib/settings';
import { maskNumber } from '@/lib/mask';

export function ReservedNumberCard({
  item,
  style,
}: {
  item: ReservedNumber;
  style: CardStyle;
}) {
  const { t } = useTranslation();
  const masked = maskNumber(item.number);

  const base =
    'reserved-card p-4 rounded-lg border border-border bg-surface-primary text-on-primary';

  if (style === 'plain') {
    return (
      <div data-testid="reserved-card" data-style="plain" className={base}>
        <div className="text-xs opacity-60">{t('reserved.callThis')}</div>
        <div className="text-xl font-mono font-bold">{masked}</div>
        <div className="text-sm opacity-70">{item.tracking}</div>
      </div>
    );
  }

  if (style === 'boarding') {
    return (
      <div
        data-testid="reserved-card"
        data-style="boarding"
        className={`${base} flex items-stretch gap-0 overflow-hidden`}
      >
        <div className="flex-1 pr-4">
          <div className="text-xs uppercase tracking-widest opacity-60">
            {item.carrier}
          </div>
          <div className="text-2xl font-mono font-bold">{masked}</div>
          <div className="text-sm opacity-70">ETA {item.eta}</div>
        </div>
        <div className="border-l border-dashed border-border pl-4 flex flex-col justify-center">
          <div className="text-xs opacity-60">{t('reserved.callThis')}</div>
          <div className="font-mono">{item.tracking}</div>
        </div>
      </div>
    );
  }

  // parcel slip (default)
  return (
    <div
      data-testid="reserved-card"
      data-style="parcel"
      className={`${base} font-mono`}
    >
      <div className="flex items-center justify-between border-b border-dashed border-border pb-2 mb-2">
        <span className="text-xs uppercase tracking-widest opacity-70">
          {item.carrier}
        </span>
        <span className="text-xs">{item.tracking}</span>
      </div>
      <div className="text-xs opacity-60">{t('reserved.callThis')}</div>
      <div className="text-2xl font-bold tracking-wider">{masked}</div>
      <div className="mt-2 h-6 w-full bg-[repeating-linear-gradient(90deg,var(--on-primary)_0,var(--on-primary)_2px,transparent_2px,transparent_5px)] opacity-80" />
      <div className="text-xs mt-1 opacity-70">ETA {item.eta}</div>
    </div>
  );
}
