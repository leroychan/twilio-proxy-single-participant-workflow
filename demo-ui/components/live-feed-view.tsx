'use client';

import { useTranslation } from 'react-i18next';
import type { DemoEvent, DemoEventType } from '@/lib/events';
import { maskNumber } from '@/lib/mask';
import { Card } from '@/components/ui/card';

const LABEL_KEY: Record<DemoEventType, string> = {
  'oos.prompt': 'liveFeed.oosPrompt',
  'lookup.request': 'liveFeed.lookupRequest',
  'lookup.result': 'liveFeed.lookupResult',
  'resolution.stored': 'liveFeed.resolutionStored',
  'oos.autocreate': 'liveFeed.oosAutocreate',
};

function isProminent(t: DemoEventType) {
  return t === 'oos.prompt' || t === 'oos.autocreate';
}

export function LiveFeedView({
  events,
  status,
}: {
  events: DemoEvent[];
  status: 'connecting' | 'open' | 'error';
}) {
  const { t } = useTranslation();
  return (
    <Card className="p-4 bg-surface-primary text-on-primary border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">{t('liveFeed.title')}</h2>
        <span className="text-xs opacity-70">{status}</span>
      </div>
      {events.length === 0 ? (
        <p className="opacity-60">{t('liveFeed.empty')}</p>
      ) : (
        <ul className="space-y-2">
          {events.map((e, i) => {
            const prominent = isProminent(e.type);
            const detail =
              maskNumber(e.realNumber || e.from) +
              (e.callSid ? ` · ${e.callSid.slice(0, 10)}…` : '');
            return (
              <li
                key={`${e.ts}-${i}`}
                data-testid="event-row"
                data-prominent={prominent ? 'true' : 'false'}
                className={
                  prominent
                    ? 'rounded-md p-3 bg-container-accent text-on-accent font-semibold'
                    : 'rounded-md p-3 border border-border'
                }
              >
                <div>{t(LABEL_KEY[e.type], { digits: e.digits ?? '' })}</div>
                <div className="text-xs opacity-70">{detail}</div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
