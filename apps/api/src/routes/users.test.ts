import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { signup, uniqueEmail } from '../test/helpers.js';

describe('GET /users/search', () => {
  it('rejects a request without a token', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/users/search?email=test@pooln.test' });
    expect(res.statusCode).toBe(401);
  });

  it('finds an existing user by exact email', async () => {
    const app = buildServer();
    const email = uniqueEmail();
    const signupRes = await signup(app, { email, displayName: 'Findable Person' });
    const { accessToken } = signupRes.json();

    const res = await app.inject({
      method: 'GET',
      url: `/users/search?email=${encodeURIComponent(email)}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.displayName).toBe('Findable Person');
    expect(body.passwordHash).toBeUndefined();
  });

  it('is case-insensitive on email', async () => {
    const app = buildServer();
    const email = uniqueEmail();
    const signupRes = await signup(app, { email, displayName: 'Case Test' });
    const { accessToken } = signupRes.json();

    const res = await app.inject({
      method: 'GET',
      url: `/users/search?email=${encodeURIComponent(email.toUpperCase())}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().displayName).toBe('Case Test');
  });

  it('returns 404 for an unknown email', async () => {
    const app = buildServer();
    const signupRes = await signup(app);
    const { accessToken } = signupRes.json();

    const res = await app.inject({
      method: 'GET',
      url: `/users/search?email=${encodeURIComponent(uniqueEmail())}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(404);
  });

  it('returns 400 for a malformed email', async () => {
    const app = buildServer();
    const signupRes = await signup(app);
    const { accessToken } = signupRes.json();

    const res = await app.inject({
      method: 'GET',
      url: '/users/search?email=not-an-email',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(400);
  });
});
