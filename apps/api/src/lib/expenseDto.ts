import type { ExpenseDTO } from '@pooln/shared';
import type { ExpenseWithParticipants } from './expenseRepo.js';
import type { UserItem } from './items.js';

export function toExpenseDTO({ expense, participants }: ExpenseWithParticipants, usersById: Map<string, UserItem>): ExpenseDTO {
  const payer = participants.find((p) => p.paidAmountMinorUnits > 0);

  return {
    id: expense.id,
    description: expense.description,
    amountMinorUnits: expense.amountMinorUnits,
    currency: expense.currency,
    splitType: expense.splitType,
    payerId: payer?.userId ?? expense.createdById,
    date: expense.date,
    notes: expense.notes,
    createdById: expense.createdById,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
    participants: participants.map((p) => {
      const user = usersById.get(p.userId);
      return {
        userId: p.userId,
        displayName: user?.displayName ?? 'Unknown user',
        avatarUrl: user?.avatarUrl ?? null,
        paidAmountMinorUnits: p.paidAmountMinorUnits,
        owedAmountMinorUnits: p.owedAmountMinorUnits,
        sharePercentBp: p.sharePercentBp,
        shareUnits: p.shareUnits,
      };
    }),
  };
}
