import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '@/lib/i18n';
import { StagingArea } from './staging-area';

beforeEach(async () => {
  await i18n.changeLanguage('en');
  localStorage.clear();
});

describe('StagingArea', () => {
  it('renders both default labels and two drop zones', () => {
    render(<StagingArea />);
    expect(screen.getByText('Courier')).toBeInTheDocument();
    expect(screen.getByText('Buyer')).toBeInTheDocument();
    expect(screen.getAllByTestId('drop-zone')).toHaveLength(2);
  });
});
