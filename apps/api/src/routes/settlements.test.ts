import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { createUser } from '../test/helpers.js';

function authHeader(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

describe('POST /settlements', () => {
  it('requires authentication', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/settlements', payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it('records a settlement and reflects it in the balance immediately', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Dinner',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    const settleRes = await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(b.accessToken),
      payload: {
        fromUserId: b.user.id,
        toUserId: a.user.id,
        amountMinorUnits: 500,
        currency: 'USD',
        note: 'Paid back in cash',
      },
    });
    expect(settleRes.statusCode).toBe(201);
    const body = settleRes.json();
    expect(body.fromDisplayName).toBeTypeOf('string');
    expect(body.toDisplayName).toBeTypeOf('string');

    const balanceRes = await app.inject({
      method: 'GET',
      url: `/balances/${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(balanceRes.json().balances).toEqual([]);
  });

  it('rejects a settlement recorded by a third party', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const outsider = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(outsider.accessToken),
      payload: {
        fromUserId: a.user.id,
        toUserId: b.user.id,
        amountMinorUnits: 500,
        currency: 'USD',
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it('rejects fromUserId equal to toUserId', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(a.accessToken),
      payload: {
        fromUserId: a.user.id,
        toUserId: a.user.id,
        amountMinorUnits: 500,
        currency: 'USD',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an unknown counterpart', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(a.accessToken),
      payload: {
        fromUserId: a.user.id,
        toUserId: '00000000-0000-0000-0000-000000000000',
        amountMinorUnits: 500,
        currency: 'USD',
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('GET /settlements', () => {
  it('lists settlements the requester is a party to, filterable by counterpart', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const c = await createUser(app);

    await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(a.accessToken),
      payload: { fromUserId: a.user.id, toUserId: b.user.id, amountMinorUnits: 100, currency: 'USD' },
    });
    await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(a.accessToken),
      payload: { fromUserId: a.user.id, toUserId: c.user.id, amountMinorUnits: 200, currency: 'USD' },
    });

    const all = await app.inject({ method: 'GET', url: '/settlements', headers: authHeader(a.accessToken) });
    expect(all.json().total).toBe(2);

    const withB = await app.inject({
      method: 'GET',
      url: `/settlements?withUserId=${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(withB.json().total).toBe(1);
    expect(withB.json().settlements[0].toUserId).toBe(b.user.id);
  });
});

describe('DELETE /settlements/:id', () => {
  it('soft deletes and restores the prior balance', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Dinner',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    const settleRes = await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(b.accessToken),
      payload: { fromUserId: b.user.id, toUserId: a.user.id, amountMinorUnits: 500, currency: 'USD' },
    });
    const settlement = settleRes.json();

    const balanceAfterSettle = await app.inject({
      method: 'GET',
      url: `/balances/${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(balanceAfterSettle.json().balances).toEqual([]);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/settlements/${settlement.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(deleteRes.statusCode).toBe(204);

    const balanceAfterDelete = await app.inject({
      method: 'GET',
      url: `/balances/${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(balanceAfterDelete.json().balances).toEqual([{ currency: 'USD', amountMinorUnits: 500 }]);
  });

  it('returns 404 for a non-party', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const outsider = await createUser(app);

    const settleRes = await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(a.accessToken),
      payload: { fromUserId: a.user.id, toUserId: b.user.id, amountMinorUnits: 500, currency: 'USD' },
    });
    const settlement = settleRes.json();

    const res = await app.inject({
      method: 'DELETE',
      url: `/settlements/${settlement.id}`,
      headers: authHeader(outsider.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });
});
