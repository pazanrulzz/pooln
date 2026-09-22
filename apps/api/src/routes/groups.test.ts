import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { createUser } from '../test/helpers.js';

function authHeader(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

describe('POST /groups', () => {
  it('rejects a request without a token', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'POST', url: '/groups', payload: { name: 'Trip' } });
    expect(res.statusCode).toBe(401);
  });

  it('creates a group and always includes the creator as a member', async () => {
    const app = buildServer();
    const a = await createUser(app, { displayName: 'A' });
    const b = await createUser(app, { displayName: 'B' });

    const res = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Cabin trip', memberIds: [b.user.id] },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.name).toBe('Cabin trip');
    expect(body.createdById).toBe(a.user.id);
    expect(body.members.map((m: { userId: string }) => m.userId).sort()).toEqual(
      [a.user.id, b.user.id].sort(),
    );
  });

  it('dedupes the creator if also listed in memberIds', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Solo', memberIds: [a.user.id] },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().members).toHaveLength(1);
  });

  it('rejects an invalid name', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const res = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: '' },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('GET /groups', () => {
  it('lists only groups the requester belongs to', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'A only' },
    });
    await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(b.accessToken),
      payload: { name: 'B only' },
    });

    const res = await app.inject({ method: 'GET', url: '/groups', headers: authHeader(a.accessToken) });
    expect(res.statusCode).toBe(200);
    const names = res.json().groups.map((g: { name: string }) => g.name);
    expect(names).toContain('A only');
    expect(names).not.toContain('B only');
  });
});

describe('GET /groups/:id', () => {
  it('returns 404 for a non-member', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Private' },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'GET',
      url: `/groups/${groupId}`,
      headers: authHeader(b.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns 404 for a nonexistent group', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const res = await app.inject({
      method: 'GET',
      url: `/groups/${randomUUID()}`,
      headers: authHeader(a.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('PATCH /groups/:id', () => {
  it('renames a group', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Old name' },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'PATCH',
      url: `/groups/${groupId}`,
      headers: authHeader(a.accessToken),
      payload: { name: 'New name' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe('New name');
  });
});

describe('POST /groups/:id/members', () => {
  it('adds a new member', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Growing group' },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/groups/${groupId}/members`,
      headers: authHeader(a.accessToken),
      payload: { userId: b.user.id },
    });

    expect(res.statusCode).toBe(201);
    expect(res.json().members.map((m: { userId: string }) => m.userId)).toContain(b.user.id);
  });

  it('returns 409 when the user is already a member', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Group', memberIds: [b.user.id] },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/groups/${groupId}/members`,
      headers: authHeader(a.accessToken),
      payload: { userId: b.user.id },
    });

    expect(res.statusCode).toBe(409);
  });

  it('returns 400 for a userId that does not exist', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Group' },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/groups/${groupId}/members`,
      headers: authHeader(a.accessToken),
      payload: { userId: randomUUID() },
    });

    expect(res.statusCode).toBe(400);
  });
});

describe('DELETE /groups/:id/members/:userId', () => {
  it('removes a member', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Group', memberIds: [b.user.id] },
    });
    const groupId = createRes.json().id;

    const removeRes = await app.inject({
      method: 'DELETE',
      url: `/groups/${groupId}/members/${b.user.id}`,
      headers: authHeader(a.accessToken),
    });
    expect(removeRes.statusCode).toBe(204);

    const getRes = await app.inject({
      method: 'GET',
      url: `/groups/${groupId}`,
      headers: authHeader(a.accessToken),
    });
    expect(getRes.json().members.map((m: { userId: string }) => m.userId)).not.toContain(b.user.id);
  });

  it('lets a member remove themselves (leave)', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Group', memberIds: [b.user.id] },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/groups/${groupId}/members/${b.user.id}`,
      headers: authHeader(b.accessToken),
    });
    expect(res.statusCode).toBe(204);
  });
});

describe('DELETE /groups/:id', () => {
  it('soft-deletes the group', async () => {
    const app = buildServer();
    const a = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Doomed group' },
    });
    const groupId = createRes.json().id;

    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/groups/${groupId}`,
      headers: authHeader(a.accessToken),
    });
    expect(deleteRes.statusCode).toBe(204);

    const getRes = await app.inject({
      method: 'GET',
      url: `/groups/${groupId}`,
      headers: authHeader(a.accessToken),
    });
    expect(getRes.statusCode).toBe(404);
  });

  it('returns 404 for a non-member', async () => {
    const app = buildServer();
    const a = await createUser(app);
    const b = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(a.accessToken),
      payload: { name: 'Private' },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'DELETE',
      url: `/groups/${groupId}`,
      headers: authHeader(b.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });
});
