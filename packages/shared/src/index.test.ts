import { describe, expect, it } from 'vitest';
import type { HealthStatus } from './index.js';

describe('HealthStatus', () => {
  it('accepts the ok status shape', () => {
    const status: HealthStatus = { status: 'ok' };
    expect(status.status).toBe('ok');
  });
});
