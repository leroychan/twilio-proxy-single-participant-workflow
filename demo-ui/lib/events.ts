export type DemoEventType =
  | 'oos.prompt'
  | 'lookup.request'
  | 'lookup.result'
  | 'resolution.stored'
  | 'oos.autocreate';

export const EVENT_TYPES: DemoEventType[] = [
  'oos.prompt',
  'lookup.request',
  'lookup.result',
  'resolution.stored',
  'oos.autocreate',
];

export type DemoEvent = {
  type: DemoEventType;
  ts: string;
  callSid?: string;
  from?: string;
  to?: string;
  digits?: string;
  realNumber?: string;
  note?: string;
};

export function parseEvent(raw: unknown): DemoEvent | null {
  if (!raw || typeof raw !== 'object') return null;
  const e = raw as Record<string, unknown>;
  if (typeof e.type !== 'string') return null;
  if (!EVENT_TYPES.includes(e.type as DemoEventType)) return null;
  if (typeof e.ts !== 'string') return null;
  return e as DemoEvent;
}
