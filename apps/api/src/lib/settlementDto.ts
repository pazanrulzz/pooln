import type { Prisma } from '@prisma/client';
import type { SettlementDTO } from '@pooln/shared';

const settlementWithUsers = {
  include: {
    fromUser: true,
    toUser: true,
  },
} satisfies Prisma.SettlementDefaultArgs;

export type SettlementWithUsers = Prisma.SettlementGetPayload<typeof settlementWithUsers>;

export function toSettlementDTO(settlement: SettlementWithUsers): SettlementDTO {
  return {
    id: settlement.id,
    fromUserId: settlement.fromUserId,
    fromDisplayName: settlement.fromUser.displayName,
    toUserId: settlement.toUserId,
    toDisplayName: settlement.toUser.displayName,
    amountMinorUnits: settlement.amountMinorUnits,
    currency: settlement.currency,
    note: settlement.note,
    settledAt: settlement.settledAt.toISOString(),
    createdById: settlement.createdById,
    createdAt: settlement.createdAt.toISOString(),
  };
}

export const settlementInclude = settlementWithUsers;
