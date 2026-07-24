import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import i18n from '@/lib/i18n';
import { MappingsTable } from './mappings-table';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('MappingsTable', () => {
  const items = [{ code: '123456', parties: ['+15551112222', '+15551230000'] }];

  it('renders a row per mapping', () => {
    render(<MappingsTable items={items} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText('123456')).toBeInTheDocument();
  });

  it('calls onDelete with the code', async () => {
    const onDelete = vi.fn();
    render(<MappingsTable items={items} onEdit={() => {}} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith('123456');
  });
});
