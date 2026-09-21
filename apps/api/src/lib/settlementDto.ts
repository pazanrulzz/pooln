import type { Settlement } from '@prisma/client';
import type { SettlementDTO } from '@pooln/shared';
import type { UserItem } from './items.js';

// fromUser/toUser display info now comes from DynamoDB (lib/userRepo.js),
// not a Prisma relation — same reasoning as expenseDto.ts.
export function toSettlementDTO(settlement: Settlement, usersById: Map<string, UserItem>): SettlementDTO {
  return {
    id: settlement.id,
    fromUserId: settlement.fromUserId,
    fromDisplayName: usersById.get(settlement.fromUserId)?.displayName ?? 'Unknown user',
    toUserId: settlement.toUserId,
    toDisplayName: usersById.get(settlement.toUserId)?.displayName ?? 'Unknown user',
    amountMinorUnits: settlement.amountMinorUnits,
    currency: settlement.currency,
    note: settlement.note,
    settledAt: settlement.settledAt.toISOString(),
    createdById: settlement.createdById,
    createdAt: settlement.createdAt.toISOString(),
  };
}
