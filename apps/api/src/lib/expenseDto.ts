import type { Prisma } from '@prisma/client';
import type { ExpenseDTO } from '@pooln/shared';
import type { UserItem } from './items.js';

// Participant display info (displayName/avatarUrl) now comes from DynamoDB
// (see lib/userRepo.js), not a Prisma relation — the `user` FK join breaks
// for any user created after the Phase 1 auth cutover, since new users no
// longer exist in Postgres at all. Callers fetch participants via
// getUsersByIds and pass the resulting map in here.
const expenseWithParticipants = {
  include: {
    participants: true,
  },
} satisfies Prisma.ExpenseDefaultArgs;

export type ExpenseWithParticipants = Prisma.ExpenseGetPayload<typeof expenseWithParticipants>;

export function toExpenseDTO(expense: ExpenseWithParticipants, usersById: Map<string, UserItem>): ExpenseDTO {
  const payer = expense.participants.find((p) => p.paidAmountMinorUnits > 0);

  return {
    id: expense.id,
    description: expense.description,
    amountMinorUnits: expense.amountMinorUnits,
    currency: expense.currency,
    splitType: expense.splitType,
    payerId: payer?.userId ?? expense.createdById,
    date: expense.date.toISOString(),
    notes: expense.notes,
    createdById: expense.createdById,
    createdAt: expense.createdAt.toISOString(),
    updatedAt: expense.updatedAt.toISOString(),
    participants: expense.participants.map((p) => {
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

export const expenseInclude = expenseWithParticipants;
