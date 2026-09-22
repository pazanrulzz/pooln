import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { createUser } from '../test/helpers.js';

function authHeader(accessToken: string) {
  return { authorization: `Bearer ${accessToken}` };
}

async function createGroupWithInvite(app: ReturnType<typeof buildServer>, ownerToken: string, name = 'Invite test group') {
  const createRes = await app.inject({
    method: 'POST',
    url: '/groups',
    headers: authHeader(ownerToken),
    payload: { name },
  });
  const groupId = createRes.json().id;

  const inviteRes = await app.inject({
    method: 'POST',
    url: `/groups/${groupId}/invite`,
    headers: authHeader(ownerToken),
  });
  const token = inviteRes.json().token;

  return { groupId, token };
}

describe('POST /groups/:id/invite', () => {
  it('rejects a non-member', async () => {
    const app = buildServer();
    const owner = await createUser(app);
    const outsider = await createUser(app);

    const createRes = await app.inject({
      method: 'POST',
      url: '/groups',
      headers: authHeader(owner.accessToken),
      payload: { name: 'Private' },
    });
    const groupId = createRes.json().id;

    const res = await app.inject({
      method: 'POST',
      url: `/groups/${groupId}/invite`,
      headers: authHeader(outsider.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });

  it('returns the same token on repeated calls', async () => {
    const app = buildServer();
    const owner = await createUser(app);
    const { groupId, token } = await createGroupWithInvite(app, owner.accessToken);

    const res = await app.inject({
      method: 'POST',
      url: `/groups/${groupId}/invite`,
      headers: authHeader(owner.accessToken),
    });
    expect(res.json().token).toBe(token);
  });
});

describe('GET /invites/:token', () => {
  it('returns a preview without requiring auth', async () => {
    const app = buildServer();
    const owner = await createUser(app, { displayName: 'Inviter' });
    const { token } = await createGroupWithInvite(app, owner.accessToken, 'Preview group');

    const res = await app.inject({ method: 'GET', url: `/invites/${token}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.groupName).toBe('Preview group');
    expect(body.invitedByDisplayName).toBe('Inviter');
  });

  it('returns 404 for an unknown token', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/invites/does-not-exist' });
    expect(res.statusCode).toBe(404);
  });
});

describe('POST /invites/:token/accept', () => {
  it('rejects a request without a token', async () => {
    const app = buildServer();
    const owner = await createUser(app);
    const { token } = await createGroupWithInvite(app, owner.accessToken);

    const res = await app.inject({ method: 'POST', url: `/invites/${token}/accept` });
    expect(res.statusCode).toBe(401);
  });

  it('adds a new user to the group', async () => {
    const app = buildServer();
    const owner = await createUser(app);
    const joiner = await createUser(app, { displayName: 'Joiner' });
    const { groupId, token } = await createGroupWithInvite(app, owner.accessToken);

    const res = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      headers: authHeader(joiner.accessToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().members.map((m: { userId: string }) => m.userId)).toContain(joiner.user.id);

    const getRes = await app.inject({
      method: 'GET',
      url: `/groups/${groupId}`,
      headers: authHeader(joiner.accessToken),
    });
    expect(getRes.statusCode).toBe(200);
  });

  it('is idempotent for someone who already joined', async () => {
    const app = buildServer();
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const { token } = await createGroupWithInvite(app, owner.accessToken);

    await app.inject({ method: 'POST', url: `/invites/${token}/accept`, headers: authHeader(joiner.accessToken) });
    const res = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      headers: authHeader(joiner.accessToken),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().members.filter((m: { userId: string }) => m.userId === joiner.user.id)).toHaveLength(1);
  });

  it('returns 404 for a revoked invite', async () => {
    const app = buildServer();
    const owner = await createUser(app);
    const joiner = await createUser(app);
    const { groupId, token } = await createGroupWithInvite(app, owner.accessToken);

    await app.inject({ method: 'DELETE', url: `/groups/${groupId}/invite`, headers: authHeader(owner.accessToken) });

    const res = await app.inject({
      method: 'POST',
      url: `/invites/${token}/accept`,
      headers: authHeader(joiner.accessToken),
    });
    expect(res.statusCode).toBe(404);
  });
});

describe('DELETE /groups/:id/invite', () => {
  it('makes the previous token invalid and a new one gets minted next time', async () => {
    const app = buildServer();
    const owner = await createUser(app);
    const { groupId, token } = await createGroupWithInvite(app, owner.accessToken);

    const revokeRes = await app.inject({
      method: 'DELETE',
      url: `/groups/${groupId}/invite`,
      headers: authHeader(owner.accessToken),
    });
    expect(revokeRes.statusCode).toBe(204);

    const previewRes = await app.inject({ method: 'GET', url: `/invites/${token}` });
    expect(previewRes.statusCode).toBe(404);

    const newInviteRes = await app.inject({
      method: 'POST',
      url: `/groups/${groupId}/invite`,
      headers: authHeader(owner.accessToken),
    });
    expect(newInviteRes.json().token).not.toBe(token);
  });
});
