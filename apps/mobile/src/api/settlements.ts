import type { CreateSettlementInput, ListSettlementsResponse, SettlementDTO } from '@pooln/shared';
import { apiFetch } from './client';

export function createSettlement(input: CreateSettlementInput) {
  return apiFetch<SettlementDTO>('/settlements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listSettlements(params: { withUserId?: string; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.withUserId) query.set('withUserId', params.withUserId);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const qs = query.toString();
  return apiFetch<ListSettlementsResponse>(`/settlements${qs ? `?${qs}` : ''}`);
}

export function deleteSettlement(id: string) {
  return apiFetch<void>(`/settlements/${id}`, { method: 'DELETE' });
}
