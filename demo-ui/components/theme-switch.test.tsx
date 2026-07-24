import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const setTheme = vi.fn();
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', setTheme }),
}));

import { ThemeSwitch } from './theme-switch';

describe('ThemeSwitch', () => {
  it('toggles from dark to light', async () => {
    render(<ThemeSwitch />);
    await userEvent.click(screen.getByRole('button'));
    expect(setTheme).toHaveBeenCalledWith('light');
  });
});
