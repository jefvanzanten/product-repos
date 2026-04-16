import { describe, it, expect, beforeAll, mock } from 'bun:test';

const mockLog = {
  id: 1,
  productId: 1,
  timestamp: '2026-01-01T00:00:00.000Z',
  amount: 250,
  unitsId: 1,
  brand: { id: 1, name: 'TestMerk' },
  consumption: { id: 1, name: 'Koffie' },
  unit: { id: 1, type: 'ml' },
};

void mock.module('../src/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          leftJoin: () => ({
            leftJoin: () => ({
              leftJoin: () => ({
                all: () => [mockLog],
              }),
            }),
          }),
        }),
      }),
    }),
    insert: () => ({
      values: () => ({
        returning: () => ({
          get: () => ({
            id: 1,
            productId: 1,
            timestamp: '2026-01-01T00:00:00.000Z',
            amount: 250,
            unitsId: 1,
          }),
        }),
      }),
    }),
  },
}));

const { createApp } = await import('../src/app');

describe('Consumption Log API', () => {
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    app = createApp();
  });

  it('GET /consumption-logs returns 200 with array', async () => {
    const res = await app.request('/consumption-logs');
    expect(res.status).toBe(200);
    const json = await res.json() as unknown[];
    expect(Array.isArray(json)).toBe(true);
  });

  it('GET /consumption-logs items bevatten brand en consumption', async () => {
    const res = await app.request('/consumption-logs');
    const json = await res.json() as typeof mockLog[];
    expect(json[0].brand?.name).toBe('TestMerk');
    expect(json[0].consumption?.name).toBe('Koffie');
    expect(json[0].unit?.type).toBe('ml');
  });

  it('POST /consumption-logs with valid data returns 201', async () => {
    const body = {
      productId: 1,
      amount: 250,
      unitsId: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    const res = await app.request('/consumption-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(201);
    const json = await res.json() as { id: number; productId: number };
    expect(json.id).toBe(1);
    expect(json.productId).toBe(1);
  });

  it('POST /consumption-logs without productId returns 422', async () => {
    const body = {
      amount: 250,
      unitsId: 1,
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    const res = await app.request('/consumption-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(422);
    const json = await res.json() as { error: { message: string } };
    expect(json.error.message).toBe('Validatiefout');
  });

  it('POST /consumption-logs without unitsId returns 422', async () => {
    const body = {
      productId: 1,
      amount: 250,
      timestamp: '2026-01-01T00:00:00.000Z',
    };
    const res = await app.request('/consumption-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    expect(res.status).toBe(422);
  });
});
