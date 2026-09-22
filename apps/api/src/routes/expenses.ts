import type { FastifyInstance } from 'fastify';
import { calculateSplit, createExpenseSchema, listExpensesQuerySchema, updateExpenseSchema } from '@pooln/shared';
import {
  getExpenseWithParticipants,
  listExpensesForGroup,
  listExpensesForUser,
  softDeleteExpense,
  createExpense as createExpenseInRepo,
  updateExpense as updateExpenseInRepo,
  type ExpenseWithParticipants,
} from '../lib/expenseRepo.js';
import { toExpenseDTO } from '../lib/expenseDto.js';
import { getUsersByIds, getUsersMapByIds } from '../lib/userRepo.js';
import { getGroupWithMembers } from '../lib/groupRepo.js';
import { isMember } from './groups.js';

async function dtoWithParticipants(expense: ExpenseWithParticipants) {
  const usersById = await getUsersMapByIds(expense.participants.map((p) => p.userId));
  return toExpenseDTO(expense, usersById);
}

function isParticipant(expense: ExpenseWithParticipants, userId: string) {
  return expense.participants.some((p) => p.userId === userId);
}

/** Grouped expenses are visible/manageable by any group member, not just their own participants. */
async function canAccessExpense(expense: ExpenseWithParticipants, userId: string): Promise<boolean> {
  if (expense.expense.groupId) {
    const group = await getGroupWithMembers(expense.expense.groupId);
    return !!group && isMember(group, userId);
  }
  return isParticipant(expense, userId);
}

type GroupCheckResult = { ok: true } | { ok: false; status: number; error: string };

/** Requester must belong to the group, and every participant must be a group member. */
async function assertGroupParticipants(
  groupId: string,
  participantIds: string[],
  requesterId: string,
): Promise<GroupCheckResult> {
  const group = await getGroupWithMembers(groupId);
  if (!group || !isMember(group, requesterId)) {
    return { ok: false, status: 404, error: 'Group not found' };
  }
  const memberIds = new Set(group.members.map((m) => m.userId));
  if (!participantIds.every((id) => memberIds.has(id))) {
    return { ok: false, status: 400, error: 'All participants must be members of the group' };
  }
  return { ok: true };
}

export async function expenseRoutes(app: FastifyInstance) {
  app.post('/expenses', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = createExpenseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const input = parsed.data;

    if (!input.participants.some((p) => p.userId === request.user.sub)) {
      return reply.code(403).send({ error: 'You must be a participant in an expense you create' });
    }

    if (input.groupId) {
      const check = await assertGroupParticipants(
        input.groupId,
        input.participants.map((p) => p.userId),
        request.user.sub,
      );
      if (!check.ok) {
        return reply.code(check.status).send({ error: check.error });
      }
    }

    const participantIds = input.participants.map((p) => p.userId);
    const users = await getUsersByIds(participantIds);
    if (users.length !== participantIds.length) {
      return reply.code(400).send({ error: 'One or more participants do not exist' });
    }

    const split = calculateSplit({
      totalAmountMinorUnits: input.amountMinorUnits,
      splitType: input.splitType,
      participants: input.participants,
    });
    if (!split.ok) {
      return reply.code(400).send({ error: split.error });
    }

    const creator = users.find((u) => u.id === request.user.sub)!;
    const currency = input.currency ?? creator.defaultCurrency;

    const expense = await createExpenseInRepo({
      description: input.description,
      amountMinorUnits: input.amountMinorUnits,
      currency,
      splitType: input.splitType,
      date: input.date,
      notes: input.notes ?? null,
      createdById: request.user.sub,
      groupId: input.groupId,
      participants: split.lines.map((line) => ({
        userId: line.userId,
        paidAmountMinorUnits: line.userId === input.payerId ? input.amountMinorUnits : 0,
        owedAmountMinorUnits: line.owedAmountMinorUnits,
        sharePercentBp: line.sharePercentBp ?? null,
        shareUnits: line.shareUnits ?? null,
      })),
    });

    const usersById = new Map(users.map((u) => [u.id, u]));
    return reply.code(201).send(toExpenseDTO(expense, usersById));
  });

  app.get('/expenses', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = listExpensesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { limit, offset, withUserId, groupId } = parsed.data;

    let result: { items: ExpenseWithParticipants[]; total: number };
    if (groupId) {
      const group = await getGroupWithMembers(groupId);
      if (!group || !isMember(group, request.user.sub)) {
        return reply.code(404).send({ error: 'Group not found' });
      }
      result = await listExpensesForGroup(groupId, { limit, offset });
    } else {
      result = await listExpensesForUser(request.user.sub, { counterpartId: withUserId, limit, offset });
    }

    const usersById = await getUsersMapByIds(result.items.flatMap((e) => e.participants.map((p) => p.userId)));
    return reply.send({ expenses: result.items.map((e) => toExpenseDTO(e, usersById)), total: result.total });
  });

  app.get('/expenses/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const expense = await getExpenseWithParticipants(id);
    if (!expense || !(await canAccessExpense(expense, request.user.sub))) {
      return reply.code(404).send({ error: 'Expense not found' });
    }
    return reply.send(await dtoWithParticipants(expense));
  });

  app.put('/expenses/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await getExpenseWithParticipants(id);
    if (!existing || !(await canAccessExpense(existing, request.user.sub))) {
      return reply.code(404).send({ error: 'Expense not found' });
    }

    const parsed = updateExpenseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const input = parsed.data;

    if (existing.expense.groupId) {
      const check = await assertGroupParticipants(
        existing.expense.groupId,
        input.participants.map((p) => p.userId),
        request.user.sub,
      );
      if (!check.ok) {
        return reply.code(check.status).send({ error: check.error });
      }
    }

    const participantIds = input.participants.map((p) => p.userId);
    const users = await getUsersByIds(participantIds);
    if (users.length !== participantIds.length) {
      return reply.code(400).send({ error: 'One or more participants do not exist' });
    }

    const split = calculateSplit({
      totalAmountMinorUnits: input.amountMinorUnits,
      splitType: input.splitType,
      participants: input.participants,
    });
    if (!split.ok) {
      return reply.code(400).send({ error: split.error });
    }

    const currency = input.currency ?? existing.expense.currency;

    const expense = await updateExpenseInRepo(id, {
      description: input.description,
      amountMinorUnits: input.amountMinorUnits,
      currency,
      splitType: input.splitType,
      date: input.date,
      notes: input.notes ?? null,
      participants: split.lines.map((line) => ({
        userId: line.userId,
        paidAmountMinorUnits: line.userId === input.payerId ? input.amountMinorUnits : 0,
        owedAmountMinorUnits: line.owedAmountMinorUnits,
        sharePercentBp: line.sharePercentBp ?? null,
        shareUnits: line.shareUnits ?? null,
      })),
    });

    const usersById = new Map(users.map((u) => [u.id, u]));
    return reply.send(toExpenseDTO(expense, usersById));
  });

  app.delete('/expenses/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await getExpenseWithParticipants(id);
    if (!existing || !(await canAccessExpense(existing, request.user.sub))) {
      return reply.code(404).send({ error: 'Expense not found' });
    }

    await softDeleteExpense(id);
    return reply.code(204).send();
  });
}
