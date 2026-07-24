'use client';

import { useTranslation } from 'react-i18next';
import { MOCK_RESERVED } from '@/lib/mock-reserved';
import { ReservedNumberCard } from './reserved-number-card';
import { useSettings } from '@/hooks/use-settings';

export function ReservedNumbers() {
  const { t } = useTranslation();
  const { settings } = useSettings();
  return (
    <section>
      <h2 className="text-lg font-bold mb-3">{t('reserved.title')}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {MOCK_RESERVED.map((item) => (
          <ReservedNumberCard key={item.number} item={item} style={settings.cardStyle} />
        ))}
      </div>
    </section>
  );
}
