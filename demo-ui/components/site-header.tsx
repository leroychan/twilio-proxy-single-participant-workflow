'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import { ThemeSwitch } from './theme-switch';
import { LanguageSwitch } from './language-switch';

export function SiteHeader() {
  const { t } = useTranslation();
  return (
    <header className="border-b border-border bg-surface-primary text-on-primary">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/twilio-logo-red.png" alt="Twilio" width={96} height={30} priority />
          <span className="font-bold hidden sm:inline">{t('app.title')}</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/mappings" className="hover:text-accent">{t('nav.mappings')}</Link>
          <Link href="/settings" className="hover:text-accent">{t('nav.settings')}</Link>
          <ThemeSwitch />
          <LanguageSwitch />
        </nav>
      </div>
    </header>
  );
}
