import type { SettlementDTO } from '@pooln/shared';
import type { SettlementPartyItem } from './items.js';

// Fully denormalized on the item itself (see settlementRepo.ts) — unlike
// expenseDto.ts, no usersById map needed here at all.
export function toSettlementDTO(settlement: SettlementPartyItem): SettlementDTO {
  return {
    id: settlement.id,
    fromUserId: settlement.fromUserId,
    fromDisplayName: settlement.fromDisplayName,
    toUserId: settlement.toUserId,
    toDisplayName: settlement.toDisplayName,
    amountMinorUnits: settlement.amountMinorUnits,
    currency: settlement.currency,
    note: settlement.note,
    settledAt: settlement.settledAt,
    createdById: settlement.createdById,
    createdAt: settlement.createdAt,
  };
}
