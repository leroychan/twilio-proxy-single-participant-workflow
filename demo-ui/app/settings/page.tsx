'use client';

import { useTranslation } from 'react-i18next';
import { SiteHeader } from '@/components/site-header';
import { useSettings } from '@/hooks/use-settings';
import type { CardStyle } from '@/lib/settings';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ThemeSwitch } from '@/components/theme-switch';
import { LanguageSwitch } from '@/components/language-switch';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { settings, update } = useSettings();

  return (
    <main className="min-h-screen bg-surface-primary text-on-primary">
      <SiteHeader />
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>

        <div className="space-y-2">
          <Label>{t('settings.cardStyle')}</Label>
          <Select
            value={settings.cardStyle}
            onValueChange={(v) => update({ cardStyle: v as CardStyle })}
          >
            <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="parcel">{t('settings.parcelSlip')}</SelectItem>
              <SelectItem value="boarding">{t('settings.boardingPass')}</SelectItem>
              <SelectItem value="plain">{t('settings.plainCard')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>{t('settings.courierLabel')}</Label>
          <Input
            value={settings.courierLabel}
            onChange={(e) => update({ courierLabel: e.target.value })}
          />
          <Label>{t('settings.buyerLabel')}</Label>
          <Input
            value={settings.buyerLabel}
            onChange={(e) => update({ buyerLabel: e.target.value })}
          />
        </div>

        <div className="flex items-center gap-4">
          <div><Label className="block mb-1">{t('settings.theme')}</Label><ThemeSwitch /></div>
          <div><Label className="block mb-1">{t('settings.language')}</Label><LanguageSwitch /></div>
        </div>
      </div>
    </main>
  );
}
