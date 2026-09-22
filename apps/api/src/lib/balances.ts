import type { BalanceLine, CounterpartBalance } from '@pooln/shared';
import { getAllExpensesForUser } from './expenseRepo.js';
import { getSettlementPartiesForUser } from './settlementRepo.js';
import { getUsersByIds } from './userRepo.js';

/**
 * Net balance between the requester and everyone they've shared an expense
 * or settlement with (or just one specific counterpart, if given). Computed
 * on read — see the plan file for why: at this scale a materialized table
 * would just be a consistency-bug generator for no real benefit.
 *
 * Known, accepted eventual-consistency gap: both repo reads go through
 * GSI1, which DynamoDB never serves with strong consistency (no
 * ConsistentRead option exists for GSIs). A request microseconds after
 * another client's POST /expenses could theoretically miss it — low
 * severity and self-healing on the next request; the creator's own
 * response is always fresh since it comes straight from the write.
 */
export async function computeBalances(
  requesterId: string,
  counterpartId?: string,
): Promise<CounterpartBalance[]> {
  const expenses = await getAllExpensesForUser(requesterId, counterpartId);
  const settlements = await getSettlementPartiesForUser(requesterId, counterpartId);

  // counterpartUserId -> currency -> net amount (positive = they owe requester)
  const net = new Map<string, Map<string, number>>();

  function addTo(counterpart: string, currency: string, amount: number) {
    if (counterpart === requesterId || amount === 0) return;
    if (!net.has(counterpart)) net.set(counterpart, new Map());
    const byCurrency = net.get(counterpart)!;
    byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + amount);
  }

  for (const { expense, participants } of expenses) {
    const payer = participants.find((p) => p.paidAmountMinorUnits > 0);
    if (!payer) continue;

    if (payer.userId === requesterId) {
      for (const p of participants) {
        if (p.userId === requesterId) continue;
        addTo(p.userId, expense.currency, p.owedAmountMinorUnits);
      }
    } else {
      const requesterLine = participants.find((p) => p.userId === requesterId);
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

  const users = await getUsersByIds(counterpartIds);
  const userById = new Map(users.map((u) => [u.id, u]));

  return counterpartIds
    .map((id) => {
      const user = userById.get(id);
      if (!user) return null;
      // Zero-balance entries are kept (not dropped) — someone you've fully
      // settled up with should still show up wherever this list is used to
      // mean "who have I shared expenses with", not just "who do I owe".
      const balances: BalanceLine[] = [...net.get(id)!.entries()]
        .filter(([, amount]) => amount !== 0)
        .map(([currency, amountMinorUnits]) => ({ currency, amountMinorUnits }));
      return { userId: id, displayName: user.displayName, avatarUrl: user.avatarUrl, balances };
    })
    .filter((b): b is CounterpartBalance => b !== null)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}
