import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import i18n from '@/lib/i18n';
import { LiveFeedView } from './live-feed-view';
import type { DemoEvent } from '@/lib/events';

beforeEach(async () => {
  await i18n.changeLanguage('en');
});

describe('LiveFeedView', () => {
  it('shows the empty state when there are no events', () => {
    render(<LiveFeedView events={[]} status="open" />);
    expect(screen.getByText(/Waiting for call activity/i)).toBeInTheDocument();
  });

  it('renders events and marks oos events prominent', () => {
    const events: DemoEvent[] = [
      { type: 'oos.autocreate', ts: '2026-07-24T00:00:01Z', from: '+15551112222' },
      { type: 'lookup.request', ts: '2026-07-24T00:00:00Z', digits: '123456' },
    ];
    render(<LiveFeedView events={events} status="open" />);
    expect(screen.getByText(/Session auto-created/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolving counterparty for code 123456/i)).toBeInTheDocument();
    expect(screen.getAllByTestId('event-row')[0]).toHaveAttribute(
      'data-prominent',
      'true'
    );
  });
});
