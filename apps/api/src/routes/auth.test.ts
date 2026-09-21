import { describe, expect, it } from 'vitest';
import { buildServer } from '../server.js';
import { signup, uniqueEmail } from '../test/helpers.js';

describe('POST /auth/signup', () => {
  it('creates a user and returns tokens', async () => {
    const app = buildServer();
    const res = await signup(app);

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.accessToken).toBeTypeOf('string');
    expect(body.refreshToken).toBeTypeOf('string');
    expect(body.user.displayName).toBe('Test User');
    expect(body.user.passwordHash).toBeUndefined();
  });

  it('rejects a duplicate email', async () => {
    const app = buildServer();
    const email = uniqueEmail();

    const first = await signup(app, { email });
    expect(first.statusCode).toBe(201);

    const second = await signup(app, { email });
    expect(second.statusCode).toBe(409);
  });

  it('rejects an invalid payload', async () => {
    const app = buildServer();
    const res = await signup(app, { password: 'short' });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('logs in with correct credentials', async () => {
    const app = buildServer();
    const email = uniqueEmail();
    await signup(app, { email, password: 'correcthorsebattery' });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'correcthorsebattery' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTypeOf('string');
  });

  it('rejects an incorrect password', async () => {
    const app = buildServer();
    const email = uniqueEmail();
    await signup(app, { email, password: 'correcthorsebattery' });

    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrongpassword' },
    });

    expect(res.statusCode).toBe(401);
  });

  it('rejects a nonexistent email', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: uniqueEmail(), password: 'whatever123' },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and issues a new access token', async () => {
    const app = buildServer();
    const signupRes = await signup(app);
    const { refreshToken } = signupRes.json();

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });

    expect(refreshRes.statusCode).toBe(200);
    const rotated = refreshRes.json();
    expect(rotated.refreshToken).not.toBe(refreshToken);
  });

  it('rejects reuse of an already-rotated refresh token', async () => {
    const app = buildServer();
    const signupRes = await signup(app);
    const { refreshToken } = signupRes.json();

    await app.inject({ method: 'POST', url: '/auth/refresh', payload: { refreshToken } });

    const reuse = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });

    expect(reuse.statusCode).toBe(401);
  });

  it('rejects a bogus refresh token', async () => {
    const app = buildServer();
    const res = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken: 'not-a-real-token' },
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token so it can no longer be used', async () => {
    const app = buildServer();
    const signupRes = await signup(app);
    const { refreshToken } = signupRes.json();

    const logoutRes = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      payload: { refreshToken },
    });
    expect(logoutRes.statusCode).toBe(204);

    const refreshRes = await app.inject({
      method: 'POST',
      url: '/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshRes.statusCode).toBe(401);
  });
});

describe('GET /me', () => {
  it('rejects a request without a token', async () => {
    const app = buildServer();
    const res = await app.inject({ method: 'GET', url: '/me' });
    expect(res.statusCode).toBe(401);
  });

  it('returns the current user profile for a valid token', async () => {
    const app = buildServer();
    const signupRes = await signup(app, { displayName: 'Me Route Tester' });
    const { accessToken } = signupRes.json();

    const res = await app.inject({
      method: 'GET',
      url: '/me',
      headers: { authorization: `Bearer ${accessToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().displayName).toBe('Me Route Tester');
  });
});

describe('PATCH /me', () => {
  it('updates the display name', async () => {
    const app = buildServer();
    const signupRes = await signup(app);
    const { accessToken } = signupRes.json();

    const res = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: `Bearer ${accessToken}` },
      payload: { displayName: 'Updated Name' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().displayName).toBe('Updated Name');
  });
});
