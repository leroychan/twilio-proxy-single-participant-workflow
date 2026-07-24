import { describe, it, expect, beforeEach } from 'vitest';
import { loadSettings, saveSettings, DEFAULT_SETTINGS } from './settings';

describe('settings store', () => {
  beforeEach(() => localStorage.clear());

  it('returns defaults when nothing is stored', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', () => {
    saveSettings({ cardStyle: 'boarding', courierLabel: 'Rider', buyerLabel: 'Customer' });
    expect(loadSettings()).toEqual({
      cardStyle: 'boarding',
      courierLabel: 'Rider',
      buyerLabel: 'Customer',
    });
  });

  it('falls back to defaults on corrupt data', () => {
    localStorage.setItem('demo-ui-settings', '{not json');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
