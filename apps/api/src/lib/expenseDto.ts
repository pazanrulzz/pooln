import type { Prisma } from '@prisma/client';
import type { ExpenseDTO } from '@pooln/shared';

const expenseWithParticipants = {
  include: {
    participants: {
      include: { user: true },
    },
  },
} satisfies Prisma.ExpenseDefaultArgs;

export type ExpenseWithParticipants = Prisma.ExpenseGetPayload<typeof expenseWithParticipants>;

export function toExpenseDTO(expense: ExpenseWithParticipants): ExpenseDTO {
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
    participants: expense.participants.map((p) => ({
      userId: p.userId,
      displayName: p.user.displayName,
      avatarUrl: p.user.avatarUrl,
      paidAmountMinorUnits: p.paidAmountMinorUnits,
      owedAmountMinorUnits: p.owedAmountMinorUnits,
      sharePercentBp: p.sharePercentBp,
      shareUnits: p.shareUnits,
    })),
  };
}

export const expenseInclude = expenseWithParticipants;
