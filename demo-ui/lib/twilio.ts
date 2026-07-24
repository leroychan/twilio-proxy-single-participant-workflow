import twilio from 'twilio';

// Mirror src/assets/helpers.private.ts LOOKUP_SYNC_MAP_NAME.
export const LOOKUP_MAP_NAME = 'lookup';

export function syncServiceSid(): string {
  return process.env.TWILIO_SYNC_SERVICE_SID || 'default';
}

export function getServerClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    throw new Error('Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN');
  }
  return twilio(sid, token);
}
