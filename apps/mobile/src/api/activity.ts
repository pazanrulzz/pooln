import type { ListActivityResponse } from '@pooln/shared';
import { apiFetch } from './client';

export function listActivity(limit?: number) {
  const qs = limit !== undefined ? `?limit=${limit}` : '';
  return apiFetch<ListActivityResponse>(`/activity${qs}`);
}
