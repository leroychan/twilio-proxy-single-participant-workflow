import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '@/lib/i18n';
import { ReservedNumberCard } from './reserved-number-card';

const item = {
  number: '+15557001001',
  tracking: 'TWL-4471-AX',
  carrier: 'ProxyPost',
  eta: '2 min',
};

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('ReservedNumberCard', () => {
  it('renders the masked number and tracking id', () => {
    render(<ReservedNumberCard item={item} style="parcel" />);
    expect(screen.getByText('TWL-4471-AX')).toBeInTheDocument();
    expect(screen.getByText(/\+1555.*01/)).toBeInTheDocument();
  });

  it('reflects the selected style via data-style', () => {
    const { rerender } = render(<ReservedNumberCard item={item} style="boarding" />);
    expect(screen.getByTestId('reserved-card')).toHaveAttribute('data-style', 'boarding');
    rerender(<ReservedNumberCard item={item} style="plain" />);
    expect(screen.getByTestId('reserved-card')).toHaveAttribute('data-style', 'plain');
  });
});
