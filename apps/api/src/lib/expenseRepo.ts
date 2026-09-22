import { randomUUID } from 'node:crypto';
import type { SplitType } from '@pooln/shared';
import { QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo, TABLE_NAME } from './dynamo.js';
import {
  EntityType,
  GSI1SK_EXPENSE_PREFIX,
  expenseMetaKey,
  expenseParticipantKey,
  expensePK,
  userExpenseIndexKeys,
  userPK,
} from './keys.js';
import { queryAllPages } from './queryAllPages.js';
import type { ExpenseItem, ExpenseParticipantItem } from './items.js';

export interface ExpenseParticipantInput {
  userId: string;
  paidAmountMinorUnits: number;
  owedAmountMinorUnits: number;
  sharePercentBp: number | null;
  shareUnits: number | null;
}

export interface ExpenseInput {
  description: string;
  amountMinorUnits: number;
  currency: string;
  splitType: SplitType;
  date?: string;
  notes: string | null;
  participants: ExpenseParticipantInput[];
}

export interface ExpenseWithParticipants {
  expense: ExpenseItem;
  participants: ExpenseParticipantItem[];
}

function buildParticipantItems(
  expenseId: string,
  isoDate: string,
  participants: ExpenseParticipantInput[],
): ExpenseParticipantItem[] {
  return participants.map((p) => ({
    ...expenseParticipantKey(expenseId, p.userId),
    entityType: EntityType.ExpenseParticipant,
    expenseId,
    userId: p.userId,
    paidAmountMinorUnits: p.paidAmountMinorUnits,
    owedAmountMinorUnits: p.owedAmountMinorUnits,
    sharePercentBp: p.sharePercentBp,
    shareUnits: p.shareUnits,
    ...userExpenseIndexKeys(p.userId, isoDate, expenseId),
  }));
}

export async function createExpense(
  input: ExpenseInput & { createdById: string },
): Promise<ExpenseWithParticipants> {
  const id = randomUUID();
  const now = new Date().toISOString();
  const date = input.date ?? now;

  const expense: ExpenseItem = {
    ...expenseMetaKey(id),
    entityType: EntityType.Expense,
    id,
    description: input.description,
    amountMinorUnits: input.amountMinorUnits,
    currency: input.currency,
    splitType: input.splitType,
    date,
    notes: input.notes,
    createdById: input.createdById,
    createdAt: now,
    updatedAt: now,
  };

  const participants = buildParticipantItems(id, date, input.participants);

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        { Put: { TableName: TABLE_NAME, Item: expense } },
        ...participants.map((p) => ({ Put: { TableName: TABLE_NAME, Item: p } })),
      ],
    }),
  );

  return { expense, participants };
}

/** One item-collection read (metadata + all participants) — same pattern as groupRepo. */
export async function getExpenseWithParticipants(id: string): Promise<ExpenseWithParticipants | null> {
  const res = await dynamo.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: { ':pk': expensePK(id) },
    }),
  );
  const items = (res.Items ?? []) as (ExpenseItem | ExpenseParticipantItem)[];

  const expense = items.find((item): item is ExpenseItem => item.entityType === EntityType.Expense);
  if (!expense || expense.deletedAt) return null;

  const participants = items.filter(
    (item): item is ExpenseParticipantItem => item.entityType === EntityType.ExpenseParticipant,
  );

  return { expense, participants };
}

/**
 * Full replace (PUT semantics). Deletes only participants NOT in the new
 * set and Puts every new participant — never both a Delete and a Put on the
 * same key, which TransactWriteItems rejects (a persisting participant is
 * just overwritten by its Put, no separate delete needed).
 */
export async function updateExpense(id: string, input: ExpenseInput): Promise<ExpenseWithParticipants> {
  const existing = await getExpenseWithParticipants(id);
  if (!existing) throw new Error('Expense not found');

  const now = new Date().toISOString();
  const date = input.date ?? existing.expense.date;
  const newParticipants = buildParticipantItems(id, date, input.participants);
  const newUserIds = new Set(newParticipants.map((p) => p.userId));
  const toRemove = existing.participants.filter((p) => !newUserIds.has(p.userId));

  const expense: ExpenseItem = {
    ...existing.expense,
    description: input.description,
    amountMinorUnits: input.amountMinorUnits,
    currency: input.currency,
    splitType: input.splitType,
    date,
    notes: input.notes,
    updatedAt: now,
  };

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        ...toRemove.map((p) => ({
          Delete: { TableName: TABLE_NAME, Key: expenseParticipantKey(id, p.userId) },
        })),
        { Put: { TableName: TABLE_NAME, Item: expense } },
        ...newParticipants.map((p) => ({ Put: { TableName: TABLE_NAME, Item: p } })),
      ],
    }),
  );

  return { expense, participants: newParticipants };
}

/** Also removes participant pointers so they stop showing up in GSI1 listings/totals. */
export async function softDeleteExpense(id: string): Promise<void> {
  const existing = await getExpenseWithParticipants(id);
  if (!existing) return;

  await dynamo.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Update: {
            TableName: TABLE_NAME,
            Key: expenseMetaKey(id),
            UpdateExpression: 'SET deletedAt = :now',
            ExpressionAttributeValues: { ':now': new Date().toISOString() },
          },
        },
        ...existing.participants.map((p) => ({
          Delete: { TableName: TABLE_NAME, Key: expenseParticipantKey(id, p.userId) },
        })),
      ],
    }),
  );
}

async function getMatchedExpensePointers(userId: string, counterpartId?: string): Promise<ExpenseParticipantItem[]> {
  const pointers = await queryAllPages<ExpenseParticipantItem>({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
    ExpressionAttributeValues: { ':pk': userPK(userId), ':prefix': GSI1SK_EXPENSE_PREFIX },
  });

  let matched = pointers;
  if (counterpartId) {
    const counterpartPointers = await queryAllPages<ExpenseParticipantItem>({
      TableName: TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk AND begins_with(GSI1SK, :prefix)',
      ExpressionAttributeValues: { ':pk': userPK(counterpartId), ':prefix': GSI1SK_EXPENSE_PREFIX },
    });
    const counterpartExpenseIds = new Set(counterpartPointers.map((p) => p.expenseId));
    matched = pointers.filter((p) => counterpartExpenseIds.has(p.expenseId));
  }

  // GSI1SK embeds the ISO date (EXPENSE#<date>#<id>), so lexicographic sort is chronological.
  return matched.sort((a, b) => b.GSI1SK.localeCompare(a.GSI1SK));
}

export async function listExpensesForUser(
  userId: string,
  opts: { counterpartId?: string; limit: number; offset: number },
): Promise<{ items: ExpenseWithParticipants[]; total: number }> {
  const matched = await getMatchedExpensePointers(userId, opts.counterpartId);
  const page = matched.slice(opts.offset, opts.offset + opts.limit);
  const items = await Promise.all(page.map((p) => getExpenseWithParticipants(p.expenseId)));
  return { items: items.filter((e): e is ExpenseWithParticipants => e !== null), total: matched.length };
}

/** No pagination — used by balances.ts, which needs every matching expense. */
export async function getAllExpensesForUser(userId: string, counterpartId?: string): Promise<ExpenseWithParticipants[]> {
  const matched = await getMatchedExpensePointers(userId, counterpartId);
  const items = await Promise.all(matched.map((p) => getExpenseWithParticipants(p.expenseId)));
  return items.filter((e): e is ExpenseWithParticipants => e !== null);
}
