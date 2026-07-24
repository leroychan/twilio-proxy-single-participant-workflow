import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '@/lib/i18n';
import { SiteHeader } from './site-header';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('SiteHeader', () => {
  it('renders nav links to mappings and settings', () => {
    render(<SiteHeader />);
    expect(screen.getByRole('link', { name: /mappings/i })).toHaveAttribute('href', '/mappings');
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/settings');
  });
});
