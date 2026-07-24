'use client';

import { useTranslation } from 'react-i18next';
import i18n, { LANG_STORAGE_KEY } from '@/lib/i18n';
import { Button } from '@/components/ui/button';

export function LanguageSwitch() {
  const { i18n: inst } = useTranslation();
  const next = inst.language === 'zh' ? 'en' : 'zh';
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label="Toggle language"
      onClick={() => {
        i18n.changeLanguage(next);
        try {
          localStorage.setItem(LANG_STORAGE_KEY, next);
        } catch {
          /* ignore */
        }
      }}
    >
      {inst.language === 'zh' ? '中文' : 'EN'}
    </Button>
  );
}
