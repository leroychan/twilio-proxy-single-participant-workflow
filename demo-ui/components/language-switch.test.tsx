import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/lib/i18n';
import { LanguageSwitch } from './language-switch';

describe('LanguageSwitch', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
    localStorage.clear();
  });

  it('switches language and persists to localStorage', async () => {
    render(<LanguageSwitch />);
    await userEvent.click(screen.getByRole('button'));
    expect(i18n.language).toBe('zh');
    expect(localStorage.getItem('demo-ui-lang')).toBe('zh');
  });
});
