export type CardStyle = 'parcel' | 'boarding' | 'plain';

export type Settings = {
  cardStyle: CardStyle;
  courierLabel: string;
  buyerLabel: string;
};

const KEY = 'demo-ui-settings';

export const DEFAULT_SETTINGS: Settings = {
  cardStyle: 'parcel',
  courierLabel: 'Courier',
  buyerLabel: 'Buyer',
};

export function loadSettings(): Settings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
