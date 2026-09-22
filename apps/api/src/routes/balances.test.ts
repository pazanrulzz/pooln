import { describe, expect, it } from 'vitest';
import type { CounterpartBalance } from '@pooln/shared';
import { buildServer } from '../server.js';
import { createUser } from '../test/helpers.js';

function authHeader(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

function byUserId(balances: CounterpartBalance[]): Record<string, CounterpartBalance> {
  return Object.fromEntries(balances.map((b) => [b.userId, b]));
}

async function createExpense(app: ReturnType<typeof buildServer>, accessToken: string, payload: object) {
  const res = await app.inject({ method: 'POST', url: '/expenses', headers: authHeader(accessToken), payload });
  return res.json();
}

describe('GET /balances', () => {
  it('requires authentication', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/balances' });
    expect(res.statusCode).toBe(401);
  });

  it('attributes a 3-participant expense correctly: non-payer pairs owe each other nothing', async () => {
    const app = buildServer();
    const a = await createUser(app, { displayName: 'A' });
    const b = await createUser(app, { displayName: 'B' });
    const c = await createUser(app, { displayName: 'C' });

    // A pays $30, split equally three ways ($10 each)
    await createExpense(app, a.accessToken, {
      description: 'Dinner',
      amountMinorUnits: 3000,
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }, { userId: c.user.id }],
    });

    const aBalances = (await app.inject({ method: 'GET', url: '/balances', headers: authHeader(a.accessToken) })).json();
    const aByUser = byUserId(aBalances);
    expect(aByUser[b.user.id]!.balances).toEqual([{ currency: 'USD', amountMinorUnits: 1000 }]);
    expect(aByUser[c.user.id]!.balances).toEqual([{ currency: 'USD', amountMinorUnits: 1000 }]);

    const bBalances = (await app.inject({ method: 'GET', url: '/balances', headers: authHeader(b.accessToken) })).json();
    // B should only see a balance with A (owes $10) — nothing with C, since B and C never
    // transacted directly, they both just owe A. This is the corrected attribution rule.
    expect(bBalances).toHaveLength(1);
    expect(bBalances[0].userId).toBe(a.user.id);
    expect(bBalances[0].balances).toEqual([{ currency: 'USD', amountMinorUnits: -1000 }]);

    const bcRes = await app.inject({
      method: 'GET',
      url: `/balances/${c.user.id}`,
      headers: authHeader(b.accessToken),
    });
    expect(bcRes.statusCode).toBe(200);
    expect(bcRes.json().balances).toEqual([]);
  });

  it('never sums balances across currencies', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    await createExpense(app, a.accessToken, {
      description: 'US trip',
      amountMinorUnits: 2000,
      currency: 'USD',
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }],
    });
    await createExpense(app, a.accessToken, {
      description: 'EU trip',
      amountMinorUnits: 1000,
      currency: 'EUR',
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }],
    });

    const res = await app.inject({
      method: 'GET',
      url: `/balances/${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    const body: CounterpartBalance = res.json();
    const byCurrency = Object.fromEntries(body.balances.map((x) => [x.currency, x.amountMinorUnits]));
    expect(byCurrency).toEqual({ USD: 1000, EUR: 500 });
  });

  it('reflects a settlement immediately', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const expense = await createExpense(app, a.accessToken, {
      description: 'Split',
      amountMinorUnits: 1000,
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }],
    });
    expect(expense.id).toBeTypeOf('string');

    // B owes A $5 — record a settlement of B paying A back in full.
    await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(b.accessToken),
      payload: {
        fromUserId: b.user.id,
        toUserId: a.user.id,
        amountMinorUnits: 500,
        currency: 'USD',
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/balances/${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(res.json().balances).toEqual([]);
  });

  it('keeps a fully-settled counterpart in the list, with an empty balances array', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app, { displayName: 'Settled Friend' });

    await createExpense(app, a.accessToken, {
      description: 'Split',
      amountMinorUnits: 1000,
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }],
    });
    await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(b.accessToken),
      payload: { fromUserId: b.user.id, toUserId: a.user.id, amountMinorUnits: 500, currency: 'USD' },
    });

    const res = await app.inject({ method: 'GET', url: '/balances', headers: authHeader(a.accessToken) });
    expect(res.statusCode).toBe(200);
    const byUser = byUserId(res.json());
    expect(byUser[b.user.id]).toEqual({
      userId: b.user.id,
      displayName: 'Settled Friend',
      avatarUrl: null,
      balances: [],
    });
  });

  it("returns the counterpart's profile even with a zero balance", async () => {
    const app = buildServer();
    const a = await createUser(app, { displayName: 'Zero Balance Person' });
    const b = await createUser(app);

    const res = await app.inject({
      method: 'GET',
      url: `/balances/${a.user.id}`,
      headers: authHeader(b.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.displayName).toBe('Zero Balance Person');
    expect(body.balances).toEqual([]);
  });

  it('returns 404 for a nonexistent counterpart', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const res = await app.inject({
      method: 'GET',
      url: '/balances/00000000-0000-0000-0000-000000000000',
      headers: authHeader(a.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });
});
