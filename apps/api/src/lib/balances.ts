import type { BalanceLine, CounterpartBalance } from '@pooln/shared';
import { prisma } from './prisma.js';

/**
 * Net balance between the requester and everyone they've shared an expense
 * or settlement with (or just one specific counterpart, if given). Computed
 * on read — see the plan file for why: at this scale a materialized table
 * would just be a consistency-bug generator for no real benefit.
 */
export async function computeBalances(
  requesterId: string,
  counterpartId?: string,
): Promise<CounterpartBalance[]> {
  const expenses = await prisma.expense.findMany({
    where: {
      deletedAt: null,
      participants: { some: { userId: requesterId } },
      ...(counterpartId ? { AND: [{ participants: { some: { userId: counterpartId } } }] } : {}),
    },
    include: { participants: true },
  });

  const settlements = await prisma.settlement.findMany({
    where: {
      deletedAt: null,
      OR: [{ fromUserId: requesterId }, { toUserId: requesterId }],
      ...(counterpartId
        ? {
            AND: [
              {
                OR: [
                  { fromUserId: requesterId, toUserId: counterpartId },
                  { fromUserId: counterpartId, toUserId: requesterId },
                ],
              },
            ],
          }
        : {}),
    },
  });

  // counterpartUserId -> currency -> net amount (positive = they owe requester)
  const net = new Map<string, Map<string, number>>();

  function addTo(counterpart: string, currency: string, amount: number) {
    if (counterpart === requesterId || amount === 0) return;
    if (!net.has(counterpart)) net.set(counterpart, new Map());
    const byCurrency = net.get(counterpart)!;
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + amount);
  }

  for (const expense of expenses) {
    const payer = expense.participants.find((p) => p.paidAmountMinorUnits > 0);
    if (!payer) continue;

    if (payer.userId === requesterId) {
      for (const p of expense.participants) {
        if (p.userId === requesterId) continue;
        addTo(p.userId, expense.currency, p.owedAmountMinorUnits);
      }
    } else {
      const requesterLine = expense.participants.find((p) => p.userId === requesterId);
      if (requesterLine) {
        addTo(payer.userId, expense.currency, -requesterLine.owedAmountMinorUnits);
      }
    }
  }

  for (const settlement of settlements) {
    if (settlement.fromUserId === requesterId) {
      addTo(settlement.toUserId, settlement.currency, settlement.amountMinorUnits);
    } else if (settlement.toUserId === requesterId) {
      addTo(settlement.fromUserId, settlement.currency, -settlement.amountMinorUnits);
    }
  }

  const counterpartIds = [...net.keys()];
  if (counterpartIds.length === 0) return [];

  const users = await prisma.user.findMany({ where: { id: { in: counterpartIds } } });
  const userById = new Map(users.map((u) => [u.id, u]));

  return counterpartIds
    .map((id) => {
      const user = userById.get(id);
      if (!user) return null;
      const balances: BalanceLine[] = [...net.get(id)!.entries()]
        .filter(([, amount]) => amount !== 0)
        .map(([currency, amountMinorUnits]) => ({ currency, amountMinorUnits }));
      if (balances.length === 0) return null;
      return { userId: id, displayName: user.displayName, avatarUrl: user.avatarUrl, balances };
    })
    .filter((b): b is CounterpartBalance => b !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
