import twilio from 'twilio';

const EVENTS_STREAM_NAME = 'demo-events'; // mirror backend helpers.private.ts

export async function GET() {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    TWILIO_SYNC_SERVICE_SID,
  } = process.env;

  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_API_KEY ||
    !TWILIO_API_SECRET ||
    !TWILIO_SYNC_SERVICE_SID
  ) {
    return Response.json(
      { error: 'Missing Twilio env configuration' },
      { status: 500 }
    );
  }

  const AccessToken = twilio.jwt.AccessToken;
  const SyncGrant = AccessToken.SyncGrant;
  const identity = 'demo-ui-viewer';

  const token = new AccessToken(
    TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY,
    TWILIO_API_SECRET,
    { identity, ttl: 3600 }
  );
  token.addGrant(new SyncGrant({ serviceSid: TWILIO_SYNC_SERVICE_SID }));

  // Referenced so the scope is explicit for readers/tooling.
  void EVENTS_STREAM_NAME;

  return Response.json({ token: token.toJwt(), identity });
}
