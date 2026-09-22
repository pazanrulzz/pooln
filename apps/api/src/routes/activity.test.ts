import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { createUser } from '../test/helpers.js';

function authHeader(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

describe('GET /activity', () => {
  it('rejects a request without a token', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/activity' });
    expect(res.statusCode).toBe(401);
  });

  it('produces created and updated entries for an edited expense, in order', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Dinner',
        amountMinorUnits: 2000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });
    const expense = createRes.json();

    await app.inject({
      method: 'PUT',
      url: `/expenses/${expense.id}`,
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Dinner (updated)',
        amountMinorUnits: 3000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    const res = await app.inject({ method: 'GET', url: '/activity', headers: authHeader(a.accessToken) });
    expect(res.statusCode).toBe(200);
    const { items } = res.json();

    const expenseEvents = items.filter((i: { type: string }) => i.type.startsWith('expense_'));
    expect(expenseEvents[0].type).toBe('expense_updated');
    expect(expenseEvents[0].expense.description).toBe('Dinner (updated)');
    expect(expenseEvents[1].type).toBe('expense_created');
  });

  it('does not emit an updated entry for a never-edited expense', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Untouched',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    const res = await app.inject({ method: 'GET', url: '/activity', headers: authHeader(a.accessToken) });
    const { items } = res.json();
    expect(items.filter((i: { type: string }) => i.type === 'expense_updated')).toHaveLength(0);
    expect(items.filter((i: { type: string }) => i.type === 'expense_created')).toHaveLength(1);
  });

  it('produces a settlement_created entry', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    await app.inject({
      method: 'POST',
      url: '/settlements',
      headers: authHeader(a.accessToken),
      payload: { fromUserId: a.user.id, toUserId: b.user.id, amountMinorUnits: 500, currency: 'USD' },
    });

    const res = await app.inject({ method: 'GET', url: '/activity', headers: authHeader(a.accessToken) });
    const { items } = res.json();
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('settlement_created');
    expect(items[0].settlement.fromUserId).toBe(a.user.id);
  });

  it("does not leak another user's activity", async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const outsider = await createUser(app);

    await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Private',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    const res = await app.inject({ method: 'GET', url: '/activity', headers: authHeader(outsider.accessToken) });
    expect(res.json().items).toHaveLength(0);
  });

  it('respects the limit query param', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    for (let i = 0; i < 3; i++) {
      await app.inject({
        method: 'POST',
        url: '/expenses',
        headers: authHeader(a.accessToken),
        payload: {
          description: `Expense ${i}`,
          amountMinorUnits: 1000,
          splitType: 'EQUAL',
          payerId: a.user.id,
          participants: [{ userId: a.user.id }, { userId: b.user.id }],
        },
      });
    }

    const res = await app.inject({
      method: 'GET',
      url: '/activity?limit=2',
      headers: authHeader(a.accessToken),
    });
    expect(res.json().items).toHaveLength(2);
  });
});
