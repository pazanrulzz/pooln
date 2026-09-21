import { randomUUID } from 'node:crypto';
import type { AuthResponse } from '@pooln/shared';
import type { buildServer } from '../server.js';

export function uniqueEmail() {
  return `test-${randomUUID()}@pooln.test`;
}

export async function signup(
  app: ReturnType<typeof buildServer>,
  overrides: Partial<Record<string, string>> = {},
) {
  return app.inject({
    method: 'POST',
    url: '/auth/signup',
    payload: {
      email: uniqueEmail(),
      password: 'longenoughpassword',
      displayName: 'Test User',
      ...overrides,
    },
  });
}

/** Convenience for tests that need a ready-to-use signed-up user. */
export async function createUser(
  app: ReturnType<typeof buildServer>,
  overrides: Partial<Record<string, string>> = {},
): Promise<AuthResponse> {
  const res = await signup(app, overrides);
  return res.json() as AuthResponse;
}
