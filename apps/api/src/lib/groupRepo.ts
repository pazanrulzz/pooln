import { randomUUID } from 'node:crypto';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  QueryCommand,
  TransactWriteCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE_NAME } from './dynamo.js';
import {
  EntityType,
  GSI1SK_GROUP_PREFIX,
  groupInviteKey,
  groupMemberKey,
  groupMetaKey,
  groupPK,
  userGroupIndexKeys,
  userPK,
} from './keys.js';
import type { GroupInviteItem, GroupItem, GroupMemberItem } from './items.js';

export class MemberAlreadyInGroupError extends Error {
  constructor() {
    super('Already a member of this group');
  }
}

export interface GroupWithMembers {
  group: GroupItem;
  members: GroupMemberItem[];
}

export async function createGroup(input: {
  name: string;
  createdById: string;
  memberIds: string[];
  avatarUrl?: string | null;
}): Promise<GroupWithMembers> {
  const id = randomUUID();
  const now = new Date().toISOString();

  const group: GroupItem = {
    ...groupMetaKey(id),
    entityType: EntityType.Group,
    id,
    name: input.name,
    avatarUrl: input.avatarUrl ?? null,
    createdById: input.createdById,
    createdAt: now,
    updatedAt: now,
  };

  const memberIds = [...new Set([input.createdById, ...input.memberIds])];
  const members: GroupMemberItem[] = memberIds.map((userId) => ({
    ...groupMemberKey(id, userId),
    entityType: EntityType.GroupMember,
    groupId: id,
    userId,
    joinedAt: now,
    ...userGroupIndexKeys(userId, now, id),
  }));

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: group } },
        ...members.map((member) => ({ Put: { TableName: TABLE_NAME, Item: member } })),
      ],
    }),
  );

  return { group, members };
}

/** One item-collection read (metadata + all members) — same pattern as expense participants. */
export async function getGroupWithMembers(id: string): Promise<GroupWithMembers | null> {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': groupPK(id) },
    }),
  );
  const items = (res.Items ?? []) as (GroupItem | GroupMemberItem)[];

  const group = items.find((item): item is GroupItem => item.entityType === EntityType.Group);
  if (!group || group.deletedAt) return null;

  const members = items
    .filter((item): item is GroupMemberItem => item.entityType === EntityType.GroupMember)
    .sort((a, b) => a.joinedAt.localeCompare(b.joinedAt));

  return { group, members };
}

export async function getGroupsForUser(userId: string): Promise<GroupWithMembers[]> {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: { ':pk': userPK(userId), ':prefix': GSI1SK_GROUP_PREFIX },
    }),
  );
  const pointers = (res.Items ?? []) as GroupMemberItem[];

  const groups = await Promise.all(pointers.map((pointer) => getGroupWithMembers(pointer.groupId)));
  return groups.filter((g): g is GroupWithMembers => g !== null);
}

export async function updateGroup(
  id: string,
  updates: { name?: string; avatarUrl?: string | null },
): Promise<GroupItem> {
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
      Key: groupMetaKey(id),
      UpdateExpression: `SET ${setClauses.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }),
  );
  return res.Attributes as GroupItem;
}

export async function addGroupMember(groupId: string, userId: string): Promise<GroupMemberItem> {
  const now = new Date().toISOString();
  const member: GroupMemberItem = {
    ...groupMemberKey(groupId, userId),
    entityType: EntityType.GroupMember,
    groupId,
    userId,
    joinedAt: now,
    ...userGroupIndexKeys(userId, now, groupId),
  };

  try {
    await dynamo.send(
      new PutCommand({ TableName: TABLE_NAME, Item: member, ConditionExpression: 'attribute_not_exists(PK)' }),
    );
  } catch (err) {
    if (err instanceof ConditionalCheckFailedException) {
      throw new MemberAlreadyInGroupError();
    }
    throw err;
  }

  return member;
}

export async function removeGroupMember(groupId: string, userId: string): Promise<void> {
  await dynamo.send(new DeleteCommand({ TableName: TABLE_NAME, Key: groupMemberKey(groupId, userId) }));
}

export async function softDeleteGroup(id: string): Promise<void> {
  await dynamo.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: groupMetaKey(id),
      UpdateExpression: 'SET deletedAt = :now',
      ExpressionAttributeValues: { ':now': new Date().toISOString() },
    }),
  );
}

/**
 * One active invite link per group, not one per invitee — reused until
 * revoked. Idempotent: repeated calls return the same token as long as the
 * invite item is still there.
 */
export async function getOrCreateGroupInvite(groupId: string, createdById: string): Promise<GroupInviteItem> {
  const groupRes = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: groupMetaKey(groupId) }));
  const group = groupRes.Item as GroupItem | undefined;

  if (group?.activeInviteToken) {
    const inviteRes = await dynamo.send(
      new GetCommand({ TableName: TABLE_NAME, Key: groupInviteKey(group.activeInviteToken) }),
    );
    if (inviteRes.Item) return inviteRes.Item as GroupInviteItem;
  }

  const token = randomUUID();
  const invite: GroupInviteItem = {
    ...groupInviteKey(token),
    entityType: EntityType.GroupInvite,
    token,
    groupId,
    createdById,
    createdAt: new Date().toISOString(),
  };

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: invite } },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: groupMetaKey(groupId),
            UpdateExpression: 'SET activeInviteToken = :token',
            ExpressionAttributeValues: { ':token': token },
          },
        },
      ],
    }),
  );

  return invite;
}

export async function revokeGroupInvite(groupId: string): Promise<void> {
  const groupRes = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: groupMetaKey(groupId) }));
  const group = groupRes.Item as GroupItem | undefined;
  if (!group?.activeInviteToken) return;

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        { Delete: { TableName: TABLE_NAME, Key: groupInviteKey(group.activeInviteToken) } },
        {
          Update: {
            TableName: TABLE_NAME,
            Key: groupMetaKey(groupId),
            UpdateExpression: 'REMOVE activeInviteToken',
          },
        },
      ],
    }),
  );
}

export async function getGroupInviteByToken(token: string): Promise<GroupInviteItem | null> {
  const res = await dynamo.send(new GetCommand({ TableName: TABLE_NAME, Key: groupInviteKey(token) }));
  return (res.Item as GroupInviteItem | undefined) ?? null;
}
