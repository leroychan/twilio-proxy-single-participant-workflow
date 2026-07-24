import { getServerClient, LOOKUP_MAP_NAME, syncServiceSid } from '@/lib/twilio';

function isValidPair(p: unknown): p is [string, string] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    p.every((x) => typeof x === 'string' && x.length > 0)
  );
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { parties } = (await req.json()) as { parties?: unknown };
  if (!isValidPair(parties)) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }
  const client = getServerClient();
  await client.sync.v1
    .services(syncServiceSid())
    .syncMaps(LOOKUP_MAP_NAME)
    .syncMapItems(code)
    .update({ data: { parties } });
  return Response.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const client = getServerClient();
  await client.sync.v1
    .services(syncServiceSid())
    .syncMaps(LOOKUP_MAP_NAME)
    .syncMapItems(code)
    .remove();
  return Response.json({ ok: true });
}
