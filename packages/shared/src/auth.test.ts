import { describe, expect, it } from 'vitest';
import { loginSchema, signupSchema } from './auth.js';

describe('signupSchema', () => {
  it('accepts a valid signup payload', () => {
    const result = signupSchema.safeParse({
      email: 'Test@Example.com',
      password: 'longenoughpassword',
      displayName: 'Test User',
    });
    expect(result.success).toBe(true);
    expect(result.data?.email).toBe('test@example.com');
  });

  it('rejects a password shorter than 8 characters', () => {
    const result = signupSchema.safeParse({
      email: 'test@example.com',
      password: 'short',
      displayName: 'Test User',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = signupSchema.safeParse({
      email: 'not-an-email',
      password: 'longenoughpassword',
      displayName: 'Test User',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'test@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
