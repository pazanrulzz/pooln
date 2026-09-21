import { randomUUID } from 'node:crypto';
import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { GetCommand, TransactWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE_NAME } from './dynamo.js';
import { EntityType, userEmailKey, userKey } from './keys.js';
import type { UserEmailItem, UserItem } from './items.js';

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('Email already in use');
  }
}

export async function getUserById(id: string): Promise<UserItem | null> {
  const res = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: userKey(id) }));
  return (res.Item as UserItem | undefined) ?? null;
}

export async function getUserByEmail(email: string): Promise<UserItem | null> {
  const lockRes = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: userEmailKey(email) }));
  const lock = lockRes.Item as UserEmailItem | undefined;
  if (!lock) return null;
  return getUserById(lock.userId);
}

export async function getUsersByIds(ids: string[]): Promise<UserItem[]> {
  const uniqueIds = [...new Set(ids)];
  const users = await Promise.all(uniqueIds.map((id) => getUserById(id)));
  return users.filter((u): u is UserItem => u !== null);
}

/** Convenience for DTO mappers that need to hydrate several userIds -> displayName/avatarUrl at once. */
export async function getUsersMapByIds(ids: string[]): Promise<Map<string, UserItem>> {
  const users = await getUsersByIds(ids);
  return new Map(users.map((u) => [u.id, u]));
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  displayName: string;
}): Promise<UserItem> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const user: UserItem = {
    ...userKey(id),
    entityType: EntityType.User,
    id,
    email: input.email,
    passwordHash: input.passwordHash,
    displayName: input.displayName,
    avatarUrl: null,
    defaultCurrency: 'USD',
    createdAt: now,
    updatedAt: now,
  };
  const emailLock: UserEmailItem = {
    ...userEmailKey(input.email),
    entityType: EntityType.UserEmail,
    email: input.email,
    userId: id,
  };

  try {
    await dynamo.send(
      new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: TABLE_NAME, Item: user, ConditionExpression: 'attribute_not_exists(PK)' } },
          { Put: { TableName: TABLE_NAME, Item: emailLock, ConditionExpression: 'attribute_not_exists(PK)' } },
        ],
      }),
    );
  } catch (err) {
    if (err instanceof TransactionCanceledException) {
      throw new EmailAlreadyInUseError();
    }
    throw err;
  }

  return user;
}

export async function updateUser(
  id: string,
  updates: { displayName?: string; defaultCurrency?: string; avatarUrl?: string | null },
): Promise<UserItem> {
  const setClauses = ['updatedAt = :updatedAt'];
  const names: Record<string, string> = {};
  const values: Record<string, unknown> = { ':updatedAt': new Date().toISOString() };

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) continue;
    setClauses.push(`#${key} = :${key}`);
    names[`#${key}`] = key;
    values[`:${key}`] = value;
  }

  const res = await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: userKey(id),
      UpdateExpression: `SET ${setClauses.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  );
  return res.Attributes as UserItem;
}
