import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { calculateSplit, createExpenseSchema, listExpensesQuerySchema, updateExpenseSchema } from '@pooln/shared';
import { prisma } from '../lib/prisma.js';
import { expenseInclude, toExpenseDTO } from '../lib/expenseDto.js';

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

    const participantIds = input.participants.map((p) => p.userId);
    const users = await prisma.user.findMany({ where: { id: { in: participantIds } } });
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

    const expense = await prisma.expense.create({
      data: {
        description: input.description,
        amountMinorUnits: input.amountMinorUnits,
        currency,
        splitType: input.splitType,
        date: input.date ? new Date(input.date) : undefined,
        notes: input.notes,
        createdById: request.user.sub,
        participants: {
          create: split.lines.map((line) => ({
            userId: line.userId,
            paidAmountMinorUnits: line.userId === input.payerId ? input.amountMinorUnits : 0,
            owedAmountMinorUnits: line.owedAmountMinorUnits,
            sharePercentBp: line.sharePercentBp,
            shareUnits: line.shareUnits,
          })),
        },
      },
      ...expenseInclude,
    });

    return reply.code(201).send(toExpenseDTO(expense));
  });

  app.get('/expenses', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = listExpensesQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { limit, offset, withUserId } = parsed.data;

    const requesterFilter: Prisma.ExpenseWhereInput = {
      deletedAt: null,
      participants: { some: { userId: request.user.sub } },
    };
    const where: Prisma.ExpenseWhereInput = withUserId
      ? { AND: [requesterFilter, { participants: { some: { userId: withUserId } } } satisfies Prisma.ExpenseWhereInput] }
      : requesterFilter;

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({ where, ...expenseInclude, orderBy: { date: 'desc' }, take: limit, skip: offset }),
      prisma.expense.count({ where }),
    ]);

    return reply.send({ expenses: expenses.map(toExpenseDTO), total });
  });

  app.get('/expenses/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const expense = await prisma.expense.findFirst({
      where: { id, deletedAt: null, participants: { some: { userId: request.user.sub } } },
      ...expenseInclude,
    });
    if (!expense) {
      return reply.code(404).send({ error: 'Expense not found' });
    }
    return reply.send(toExpenseDTO(expense));
  });

  app.put('/expenses/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.expense.findFirst({
      where: { id, deletedAt: null, participants: { some: { userId: request.user.sub } } },
    });
    if (!existing) {
      return reply.code(404).send({ error: 'Expense not found' });
    }

    const parsed = updateExpenseSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const input = parsed.data;

    const participantIds = input.participants.map((p) => p.userId);
    const users = await prisma.user.findMany({ where: { id: { in: participantIds } } });
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

    const currency = input.currency ?? existing.currency;

    const expense = await prisma.$transaction(async (tx) => {
      await tx.expenseParticipant.deleteMany({ where: { expenseId: id } });
      return tx.expense.update({
        where: { id },
        data: {
          description: input.description,
          amountMinorUnits: input.amountMinorUnits,
          currency,
          splitType: input.splitType,
          date: input.date ? new Date(input.date) : undefined,
          notes: input.notes,
          participants: {
            create: split.lines.map((line) => ({
              userId: line.userId,
              paidAmountMinorUnits: line.userId === input.payerId ? input.amountMinorUnits : 0,
              owedAmountMinorUnits: line.owedAmountMinorUnits,
              sharePercentBp: line.sharePercentBp,
              shareUnits: line.shareUnits,
            })),
          },
        },
        ...expenseInclude,
      });
    });

    return reply.send(toExpenseDTO(expense));
  });

  app.delete('/expenses/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.expense.findFirst({
      where: { id, deletedAt: null, participants: { some: { userId: request.user.sub } } },
    });
    if (!existing) {
      return reply.code(404).send({ error: 'Expense not found' });
    }

    await prisma.expense.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.code(204).send();
  });
}
