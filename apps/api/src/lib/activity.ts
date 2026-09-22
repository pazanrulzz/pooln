import type { ActivityItemDTO } from '@pooln/shared';
import { getAllExpensesForUser } from './expenseRepo.js';
import { getSettlementPartiesForUser } from './settlementRepo.js';
import { toExpenseDTO } from './expenseDto.js';
import { toSettlementDTO } from './settlementDto.js';
import { getUsersMapByIds } from './userRepo.js';

/**
 * Computed on read from data that already exists — same reasoning as
 * lib/balances.ts, doubly so here since activity is inherently a read of
 * other entities' history, not data of its own.
 */
export async function getRecentActivity(userId: string, limit: number): Promise<ActivityItemDTO[]> {
  const [expenses, settlements] = await Promise.all([
    getAllExpensesForUser(userId),
    getSettlementPartiesForUser(userId),
  ]);

  const usersById = await getUsersMapByIds(expenses.flatMap((e) => e.participants.map((p) => p.userId)));

  const events: ActivityItemDTO[] = [];

  for (const e of expenses) {
    const dto = toExpenseDTO(e, usersById);
    events.push({ type: 'expense_created', timestamp: e.expense.createdAt, expense: dto });
    if (e.expense.updatedAt !== e.expense.createdAt) {
      events.push({ type: 'expense_updated', timestamp: e.expense.updatedAt, expense: dto });
    }
  }

  for (const s of settlements) {
    events.push({ type: 'settlement_created', timestamp: s.createdAt, settlement: toSettlementDTO(s) });
  }

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
}
