import { describe, it, expect, vi, beforeEach } from 'vitest';

const list = vi.fn();
const create = vi.fn();
const mapItems = { list, create };

vi.mock('@/lib/twilio', () => ({
  LOOKUP_MAP_NAME: 'lookup',
  syncServiceSid: () => 'IStest',
  getServerClient: () => ({
    sync: {
      v1: {
        services: () => ({
          syncMaps: () => ({ syncMapItems: mapItems }),
        }),
      },
    },
  }),
}));

beforeEach(() => {
  list.mockReset();
  create.mockReset();
});

describe('/api/mappings', () => {
  it('GET lists items as { code, parties }', async () => {
    list.mockResolvedValue([
      { key: '123456', data: { parties: ['+15551112222', '+15551230000'] } },
    ]);
    const { GET } = await import('./route');
    const res = await GET();
    const body = await res.json();
    expect(body.items).toEqual([
      { code: '123456', parties: ['+15551112222', '+15551230000'] },
    ]);
  });

  it('POST creates a map item', async () => {
    create.mockResolvedValue({});
    const { POST } = await import('./route');
    const req = new Request('http://x/api/mappings', {
      method: 'POST',
      body: JSON.stringify({ code: '777777', parties: ['+15551112222', '+15551230000'] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(create).toHaveBeenCalledWith({
      key: '777777',
      data: { parties: ['+15551112222', '+15551230000'] },
    });
  });

  it('POST rejects a bad payload', async () => {
    const { POST } = await import('./route');
    const req = new Request('http://x/api/mappings', {
      method: 'POST',
      body: JSON.stringify({ code: '', parties: ['x'] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
