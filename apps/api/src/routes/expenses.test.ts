import { describe, expect, it } from 'vitest';
import type { ExpenseParticipantDTO } from '@pooln/shared';
import { buildServer } from '../server.js';
import { createUser } from '../test/helpers.js';

function authHeader(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

function byUserId(participants: ExpenseParticipantDTO[]): Record<string, ExpenseParticipantDTO> {
  return Object.fromEntries(participants.map((p) => [p.userId, p]));
}

describe('POST /expenses', () => {
  it('creates an EQUAL split and rounds the remainder deterministically', async () => {
    const app = buildServer();
    const a = await createUser(app, { displayName: 'A' });
    const b = await createUser(app, { displayName: 'B' });
    const c = await createUser(app, { displayName: 'C' });

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Dinner',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }, { userId: c.user.id }],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.payerId).toBe(a.user.id);
    expect(body.currency).toBe('USD');
    const byUser = byUserId(body.participants);
    expect(
      byUser[a.user.id]!.owedAmountMinorUnits +
        byUser[b.user.id]!.owedAmountMinorUnits +
        byUser[c.user.id]!.owedAmountMinorUnits,
    ).toBe(1000);
    expect(byUser[a.user.id]!.paidAmountMinorUnits).toBe(1000);
    expect(byUser[b.user.id]!.paidAmountMinorUnits).toBe(0);
  });

  it('creates an EXACT split', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Groceries',
        amountMinorUnits: 1000,
        splitType: 'EXACT',
        payerId: a.user.id,
        participants: [
          { userId: a.user.id, value: 600 },
          { userId: b.user.id, value: 400 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    const byUser = byUserId(body.participants);
    expect(byUser[a.user.id]!.owedAmountMinorUnits).toBe(600);
    expect(byUser[b.user.id]!.owedAmountMinorUnits).toBe(400);
  });

  it('creates a PERCENTAGE split', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Rent',
        amountMinorUnits: 1000,
        splitType: 'PERCENTAGE',
        payerId: a.user.id,
        participants: [
          { userId: a.user.id, value: 60 },
          { userId: b.user.id, value: 40 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    const byUser = byUserId(body.participants);
    expect(byUser[a.user.id]!.owedAmountMinorUnits).toBe(600);
    expect(byUser[b.user.id]!.owedAmountMinorUnits).toBe(400);
  });

  it('creates a SHARES split', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Cabin',
        amountMinorUnits: 900,
        splitType: 'SHARES',
        payerId: a.user.id,
        participants: [
          { userId: a.user.id, value: 2 },
          { userId: b.user.id, value: 1 },
        ],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    const byUser = byUserId(body.participants);
    expect(byUser[a.user.id]!.owedAmountMinorUnits).toBe(600);
    expect(byUser[b.user.id]!.owedAmountMinorUnits).toBe(300);
  });

  it('rejects creating an expense the requester is not part of', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const c = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Not mine',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: b.user.id,
        participants: [{ userId: b.user.id }, { userId: c.user.id }],
      },
    });

    expect(res.statusCode).toBe(403);
  });

  it('rejects an unknown participant', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Ghost',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: '00000000-0000-0000-0000-000000000000' }],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('rejects an EXACT split that does not sum to the total', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Bad math',
        amountMinorUnits: 1000,
        splitType: 'EXACT',
        payerId: a.user.id,
        participants: [
          { userId: a.user.id, value: 600 },
          { userId: b.user.id, value: 300 },
        ],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('requires authentication', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/expenses', payload: {} });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /expenses and /expenses/:id', () => {
  async function createExpense(app: ReturnType<typeof buildServer>, accessToken: string, payload: object) {
    const res = await app.inject({ method: 'POST', url: '/expenses', headers: authHeader(accessToken), payload });
    return res.json();
  }

  it('lists expenses the requester participates in, newest first', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const c = await createUser(app);

    await createExpense(app, a.accessToken, {
      description: 'One',
      amountMinorUnits: 1000,
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }],
    });
    // c isn't a participant here — should not see it
    await createExpense(app, b.accessToken, {
      description: 'Not visible to A',
      amountMinorUnits: 500,
      splitType: 'EQUAL',
      payerId: b.user.id,
      participants: [{ userId: b.user.id }, { userId: c.user.id }],
    });

    const res = await app.inject({ method: 'GET', url: '/expenses', headers: authHeader(a.accessToken) });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.expenses).toHaveLength(1);
    expect(body.expenses[0].description).toBe('One');
  });

  it('filters by withUserId', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const c = await createUser(app);

    await createExpense(app, a.accessToken, {
      description: 'With B',
      amountMinorUnits: 1000,
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }],
    });
    await createExpense(app, a.accessToken, {
      description: 'With C',
      amountMinorUnits: 1000,
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: c.user.id }],
    });

    const res = await app.inject({
      method: 'GET',
      url: `/expenses?withUserId=${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.expenses[0].description).toBe('With B');
  });

  it('returns 404 for a non-participant', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const outsider = await createUser(app);

    const expense = await createExpense(app, a.accessToken, {
      description: 'Private',
      amountMinorUnits: 1000,
      splitType: 'EQUAL',
      payerId: a.user.id,
      participants: [{ userId: a.user.id }, { userId: b.user.id }],
    });

    const res = await app.inject({
      method: 'GET',
      url: `/expenses/${expense.id}`,
      headers: authHeader(outsider.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PUT /expenses/:id', () => {
  it('fully recomputes the split', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Original',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });
    const expense = createRes.json();

    const updateRes = await app.inject({
      method: 'PUT',
      url: `/expenses/${expense.id}`,
      headers: authHeader(b.accessToken),
      payload: {
        description: 'Updated',
        amountMinorUnits: 2000,
        splitType: 'EXACT',
        payerId: b.user.id,
        participants: [
          { userId: a.user.id, value: 500 },
          { userId: b.user.id, value: 1500 },
        ],
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = updateRes.json();
    expect(updated.description).toBe('Updated');
    expect(updated.amountMinorUnits).toBe(2000);
    expect(updated.payerId).toBe(b.user.id);
    const byUser = byUserId(updated.participants);
    expect(byUser[a.user.id]!.owedAmountMinorUnits).toBe(500);
    expect(byUser[b.user.id]!.paidAmountMinorUnits).toBe(2000);
  });

  it('removes a participant while others persist (no key collision on the underlying write)', async () => {
    const app = buildServer();
    const a = await createUser(app, { displayName: 'A' });
    const b = await createUser(app, { displayName: 'B' });
    const c = await createUser(app, { displayName: 'C' });

    const createRes = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Three-way split',
        amountMinorUnits: 3000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }, { userId: c.user.id }],
      },
    });
    const expense = createRes.json();

    // A and B persist across the edit; only C is dropped.
    const updateRes = await app.inject({
      method: 'PUT',
      url: `/expenses/${expense.id}`,
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Two-way split',
        amountMinorUnits: 2000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    expect(updateRes.statusCode).toBe(200);
    const updated = updateRes.json();
    expect(updated.participants.map((p: { userId: string }) => p.userId).sort()).toEqual(
      [a.user.id, b.user.id].sort(),
    );

    const getRes = await app.inject({
      method: 'GET',
      url: `/expenses/${expense.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(getRes.json().participants).toHaveLength(2);
  });
});

describe('DELETE /expenses/:id', () => {
  it('soft deletes so it disappears from lists and detail', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Doomed',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });
    const expense = createRes.json();

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/expenses/${expense.id}`,
      headers: authHeader(b.accessToken),
    });
    expect(deleteRes.statusCode).toBe(204);

    const getRes = await app.inject({
      method: 'GET',
      url: `/expenses/${expense.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(getRes.statusCode).toBe(404);

    const listRes = await app.inject({ method: 'GET', url: '/expenses', headers: authHeader(a.accessToken) });
    expect(listRes.json().total).toBe(0);
  });
});

async function createGroup(app: ReturnType<typeof buildServer>, accessToken: string, memberIds: string[]) {
  const res = await app.inject({
    method: 'POST',
    url: '/groups',
    headers: authHeader(accessToken),
    payload: { name: 'Munich', memberIds },
  });
  return res.json();
}

describe('Group-scoped expenses', () => {
  it('restricts participants to group members and rejects an outsider', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const outsider = await createUser(app);

    const group = await createGroup(app, a.accessToken, [b.user.id]);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Hotel',
        amountMinorUnits: 10000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        groupId: group.id,
        participants: [{ userId: a.user.id }, { userId: outsider.user.id }],
      },
    });

    expect(res.statusCode).toBe(400);
  });

  it('lets a subset of group members split the expense', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const c = await createUser(app);

    const group = await createGroup(app, a.accessToken, [b.user.id, c.user.id]);

    const res = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Dinner for two',
        amountMinorUnits: 4000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        groupId: group.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.groupId).toBe(group.id);
    expect(body.participants.map((p: { userId: string }) => p.userId).sort()).toEqual(
      [a.user.id, b.user.id].sort(),
    );
  });

  it('lets a non-participant group member view, edit, and delete the expense', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const c = await createUser(app, { displayName: 'C' });

    const group = await createGroup(app, a.accessToken, [b.user.id, c.user.id]);

    const createRes = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Groceries',
        amountMinorUnits: 2000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        groupId: group.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });
    const expense = createRes.json();

    // C wasn't picked as a participant, but is still a group member.
    const getRes = await app.inject({
      method: 'GET',
      url: `/expenses/${expense.id}`,
      headers: authHeader(c.accessToken),
    });
    expect(getRes.statusCode).toBe(200);

    const putRes = await app.inject({
      method: 'PUT',
      url: `/expenses/${expense.id}`,
      headers: authHeader(c.accessToken),
      payload: {
        description: 'Groceries (updated)',
        amountMinorUnits: 3000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });
    expect(putRes.statusCode).toBe(200);

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/expenses/${expense.id}`,
      headers: authHeader(c.accessToken),
    });
    expect(deleteRes.statusCode).toBe(204);
  });

  it('returns 404 for a non-group-member, even by direct id', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);
    const outsider = await createUser(app);

    const group = await createGroup(app, a.accessToken, [b.user.id]);

    const createRes = await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Taxi',
        amountMinorUnits: 1500,
        splitType: 'EQUAL',
        payerId: a.user.id,
        groupId: group.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });
    const expense = createRes.json();

    const res = await app.inject({
      method: 'GET',
      url: `/expenses/${expense.id}`,
      headers: authHeader(outsider.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /expenses?groupId= returns only that group\'s expenses', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const group = await createGroup(app, a.accessToken, [b.user.id]);

    await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'In the group',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        groupId: group.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });
    await app.inject({
      method: 'POST',
      url: '/expenses',
      headers: authHeader(a.accessToken),
      payload: {
        description: 'Not in the group',
        amountMinorUnits: 1000,
        splitType: 'EQUAL',
        payerId: a.user.id,
        participants: [{ userId: a.user.id }, { userId: b.user.id }],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/expenses?groupId=${group.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.total).toBe(1);
    expect(body.expenses[0].description).toBe('In the group');
  });

  it('rejects a non-group-member listing a group\'s expenses', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const outsider = await createUser(app);

    const group = await createGroup(app, a.accessToken, []);

    const res = await app.inject({
      method: 'GET',
      url: `/expenses?groupId=${group.id}`,
      headers: authHeader(outsider.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });
});
