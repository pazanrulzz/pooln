import type {
  CreateExpenseInput,
  ExpenseDTO,
  ListExpensesResponse,
  UpdateExpenseInput,
} from '@pooln/shared';
import { apiFetch } from './client';

export function createExpense(input: CreateExpenseInput) {
  return apiFetch<ExpenseDTO>('/expenses', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listExpenses(params: { withUserId?: string; limit?: number; offset?: number } = {}) {
  const query = new URLSearchParams();
  if (params.withUserId) query.set('withUserId', params.withUserId);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.offset !== undefined) query.set('offset', String(params.offset));
  const qs = query.toString();
  return apiFetch<ListExpensesResponse>(`/expenses${qs ? `?${qs}` : ''}`);
}

export function getExpense(id: string) {
  return apiFetch<ExpenseDTO>(`/expenses/${id}`);
}

export function updateExpense(id: string, input: UpdateExpenseInput) {
  return apiFetch<ExpenseDTO>(`/expenses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export function deleteExpense(id: string) {
  return apiFetch<void>(`/expenses/${id}`, { method: 'DELETE' });
}
