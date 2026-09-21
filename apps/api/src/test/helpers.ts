import { randomUUID } from 'node:crypto';
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
