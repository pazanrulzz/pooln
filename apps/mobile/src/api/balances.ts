import type { CounterpartBalance } from '@pooln/shared';
import { apiFetch } from './client';

export function listBalances() {
  return apiFetch<CounterpartBalance[]>('/balances');
}

export function getBalanceWith(userId: string) {
  return apiFetch<CounterpartBalance>(`/balances/${userId}`);
}
