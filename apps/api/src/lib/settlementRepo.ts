import { randomUUID } from 'node:crypto';
import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE_NAME } from './dynamo.js';
import { EntityType, GSI1SK_SETTLEMENT_PREFIX, settlementPK, settlementPartyKey, userPK, userSettlementIndexKeys } from './keys.js';
import { queryAllPages } from './queryAllPages.js';
import type { SettlementPartyItem } from './items.js';

export interface CreateSettlementInput {
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  amountMinorUnits: number;
  currency: string;
  note: string | null;
  settledAt?: string;
  createdById: string;
}

/**
 * Fully denormalized (both party items carry the complete settlement data,
 * differing only in their own PK/SK/GSI1 keys) — GET /settlements needs
 * zero fan-out, the GSI1 query result *is* the DTO data.
 */
export async function createSettlement(input: CreateSettlementInput): Promise<SettlementPartyItem[]> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const settledAt = input.settledAt ?? now;

  const base = {
    entityType: EntityType.Settlement,
    id,
    fromUserId: input.fromUserId,
    fromDisplayName: input.fromDisplayName,
    toUserId: input.toUserId,
    toDisplayName: input.toDisplayName,
    amountMinorUnits: input.amountMinorUnits,
    currency: input.currency,
    note: input.note,
    settledAt,
    createdById: input.createdById,
    createdAt: now,
  };

  const fromParty: SettlementPartyItem = {
    ...settlementPartyKey(id, input.fromUserId),
    ...base,
    ...userSettlementIndexKeys(input.fromUserId, settledAt, id),
  };
  const toParty: SettlementPartyItem = {
    ...settlementPartyKey(id, input.toUserId),
    ...base,
    ...userSettlementIndexKeys(input.toUserId, settledAt, id),
  };

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: fromParty } },
        { Put: { TableName: TABLE_NAME, Item: toParty } },
      ],
    }),
  );

  return [fromParty, toParty];
}

/** Both party items are identical in content — either can be used as the canonical DTO source. */
export async function getSettlementParties(id: string): Promise<SettlementPartyItem[] | null> {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': settlementPK(id) },
    }),
  );
  const items = (res.Items ?? []) as SettlementPartyItem[];
  if (items.length === 0 || items[0]!.deletedAt) return null;
  return items;
}

export async function softDeleteSettlement(id: string): Promise<void> {
  const items = await getSettlementParties(id);
  if (!items) return;

  const now = new Date().toISOString();
  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: items.map((item) => ({
        Update: {
          TableName: TABLE_NAME,
          Key: { PK: item.PK, SK: item.SK },
          UpdateExpression: 'SET deletedAt = :now',
          ExpressionAttributeValues: { ':now': now },
        },
      })),
    }),
  );
}

export async function getSettlementPartiesForUser(
  userId: string,
  counterpartId?: string,
): Promise<SettlementPartyItem[]> {
  const items = await queryAllPages<SettlementPartyItem>({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
    ExpressionAttributeValues: { ':pk': userPK(userId), ':prefix': GSI1SK_SETTLEMENT_PREFIX },
  });

  return items
    .filter((item) => !item.deletedAt)
    .filter((item) => !counterpartId || item.fromUserId === counterpartId || item.toUserId === counterpartId)
    .sort((a, b) => b.settledAt.localeCompare(a.settledAt));
}
