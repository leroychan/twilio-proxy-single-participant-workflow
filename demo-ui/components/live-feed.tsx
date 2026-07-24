'use client';

import { useSyncStream } from '@/hooks/use-sync-stream';
import { LiveFeedView } from './live-feed-view';

export function LiveFeed() {
  const { events, status } = useSyncStream();
  return <LiveFeedView events={events} status={status} />;
}
