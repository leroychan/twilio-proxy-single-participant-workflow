import path from 'path';

// Load the helper module directly (same pattern the functions use at runtime).
const helpers = require(path.resolve(
  __dirname,
  '../src/assets/helpers.private.ts'
)) as typeof import('../src/assets/helpers.private');

function makeClient(create: jest.Mock, streamCreate?: jest.Mock) {
  const streamMessages = { create };
  const syncStreams: any = jest.fn(() => ({ streamMessages }));
  syncStreams.create = streamCreate ?? jest.fn().mockResolvedValue({});
  const services = jest.fn(() => ({ syncStreams }));
  return { client: { sync: { v1: { services } } }, syncStreams };
}

const EVENT = { type: 'lookup.request', ts: '2026-07-24T00:00:00.000Z' } as const;

it('publishes a stream message with the event as data', async () => {
  const create = jest.fn().mockResolvedValue({});
  const { client, syncStreams } = makeClient(create);

  await helpers.publishEvent(client as any, 'ISxxxx', EVENT as any);

  expect(syncStreams).toHaveBeenCalledWith(helpers.EVENTS_STREAM_NAME);
  expect(create).toHaveBeenCalledWith({ data: EVENT });
});

it('never throws when the stream API rejects (best-effort)', async () => {
  const create = jest.fn().mockRejectedValue(new Error('404 no stream'));
  const streamCreate = jest.fn().mockRejectedValue(new Error('still failing'));
  const { client } = makeClient(create, streamCreate);

  await expect(
    helpers.publishEvent(client as any, 'ISxxxx', EVENT as any)
  ).resolves.toBeUndefined();
});

it('creates the stream then retries once when the first publish fails', async () => {
  const create = jest
    .fn()
    .mockRejectedValueOnce(new Error('404 no stream'))
    .mockResolvedValueOnce({});
  const streamCreate = jest.fn().mockResolvedValue({});
  const { client } = makeClient(create, streamCreate);

  await helpers.publishEvent(client as any, 'ISxxxx', EVENT as any);

  expect(streamCreate).toHaveBeenCalledWith({
    uniqueName: helpers.EVENTS_STREAM_NAME,
  });
  expect(create).toHaveBeenCalledTimes(2);
});
