import { getServerClient, LOOKUP_MAP_NAME, syncServiceSid } from '@/lib/twilio';

function isValidPair(p: unknown): p is [string, string] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((x) => typeof x === 'string' && x.length > 0)
  );
}

export async function GET() {
  const client = getServerClient();
  const items = await client.sync.v1
    .services(syncServiceSid())
    .syncMaps(LOOKUP_MAP_NAME)
    .syncMapItems.list({ limit: 200 });
  return Response.json({
    items: items.map((i: any) => ({
      code: i.key,
      parties: (i.data && i.data.parties) || [],
    })),
  });
}

export async function POST(req: Request) {
  const { code, parties } = (await req.json()) as {
    code?: string;
    parties?: unknown;
  };
  if (!code || !isValidPair(parties)) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const client = getServerClient();
  await client.sync.v1
    .services(syncServiceSid())
    .syncMaps(LOOKUP_MAP_NAME)
    .syncMapItems.create({ key: code, data: { parties } });
  return Response.json({ ok: true });
}
