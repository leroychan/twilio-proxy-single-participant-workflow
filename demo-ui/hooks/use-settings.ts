'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings,
} from '@/lib/settings';

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => setSettings(loadSettings()), []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  }, []);

  return { settings, update };
}
