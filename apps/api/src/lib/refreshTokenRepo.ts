import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { GetCommand, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE_NAME } from './dynamo.js';
import { EntityType, refreshTokenKey } from './keys.js';
import type { RefreshTokenItem } from './items.js';

// Not yet activated at the table level (would need UpdateTimeToLive on both
// the local and real tables) — stored now so that's a config-only follow-up
// later, not a data-model change.
const TTL_CLEANUP_BUFFER_SECONDS = 60 * 60 * 24 * 7; // 7 days past expiresAt

export async function createRefreshToken(input: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<void> {
  const item: RefreshTokenItem = {
    ...refreshTokenKey(input.tokenHash),
    entityType: EntityType.RefreshToken,
    tokenHash: input.tokenHash,
    userId: input.userId,
    expiresAt: input.expiresAt.toISOString(),
    createdAt: new Date().toISOString(),
    ttl: Math.floor(input.expiresAt.getTime() / 1000) + TTL_CLEANUP_BUFFER_SECONDS,
  };
  await dynamo.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
}

export async function getRefreshToken(tokenHash: string): Promise<RefreshTokenItem | null> {
  const res = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: refreshTokenKey(tokenHash) }));
  return (res.Item as RefreshTokenItem | undefined) ?? null;
}

/** Unconditional — caller (the /auth/refresh route) has already validated current state. */
export async function revokeRefreshToken(tokenHash: string): Promise<void> {
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: refreshTokenKey(tokenHash),
      UpdateExpression: 'SET revokedAt = :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() },
    }),
  );
}

/**
 * Idempotent: no-ops if the token doesn't exist or is already revoked,
 * matching the old `updateMany({ where: { revokedAt: null } })` semantics
 * for logout (never errors on a token that's already gone/revoked).
 */
export async function revokeRefreshTokenIfActive(tokenHash: string): Promise<void> {
  try {
    await dynamo.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: refreshTokenKey(tokenHash),
        UpdateExpression: 'SET revokedAt = :now',
        ConditionExpression: 'attribute_exists(PK) AND attribute_not_exists(revokedAt)',
        ExpressionAttributeValues: { ':now': new Date().toISOString() },
      }),
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) return;
    throw err;
  }
}
