'use client';

import { useTranslation } from 'react-i18next';

export function DropZone({ label }: { label: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="text-center font-bold mb-2">{label}</div>
      <div
        data-testid="drop-zone"
        className="min-h-64 rounded-xl border-2 border-dashed border-border flex items-center justify-center text-on-primary/50 select-none"
      >
        {t('staging.dropHint')}
      </div>
    </div>
  );
}
