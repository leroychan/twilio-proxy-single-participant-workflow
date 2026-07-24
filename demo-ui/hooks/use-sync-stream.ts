'use client';

import { useEffect, useRef, useState } from 'react';
import { SyncClient } from 'twilio-sync';
import { parseEvent, type DemoEvent } from '@/lib/events';

const STREAM_NAME = 'demo-events'; // mirror backend EVENTS_STREAM_NAME

export function useSyncStream() {
  const [events, setEvents] = useState<DemoEvent[]>([]);
  const [status, setStatus] = useState<'connecting' | 'open' | 'error'>(
    'connecting'
  );
  const clientRef = useRef<SyncClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/token');
        const { token } = await res.json();
        if (cancelled) return;
        const client = new SyncClient(token);
        clientRef.current = client;
        const stream = await client.stream(STREAM_NAME);
        if (cancelled) return;
        setStatus('open');
        stream.on('messagePublished', (args: { message: { data: unknown } }) => {
          const parsed = parseEvent(args.message.data);
          if (parsed) setEvents((prev) => [parsed, ...prev].slice(0, 100));
        });
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      clientRef.current?.shutdown?.();
    };
  }, []);

  return { events, status };
}
