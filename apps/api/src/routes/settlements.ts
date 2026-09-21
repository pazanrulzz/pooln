import type { FastifyInstance } from 'fastify';
import type { Prisma } from '@prisma/client';
import { createSettlementSchema, listSettlementsQuerySchema } from '@pooln/shared';
import { prisma } from '../lib/prisma.js';
import { toSettlementDTO } from '../lib/settlementDto.js';
import { getUsersByIds, getUsersMapByIds } from '../lib/userRepo.js';

export async function settlementRoutes(app: FastifyInstance) {
  app.post('/settlements', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = createSettlementSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const input = parsed.data;

    if (request.user.sub !== input.fromUserId && request.user.sub !== input.toUserId) {
      return reply.code(403).send({ error: 'You must be a party to a settlement you record' });
    }

    const users = await getUsersByIds([input.fromUserId, input.toUserId]);
    if (users.length !== 2) {
      return reply.code(400).send({ error: 'One or both users do not exist' });
    }

    const settlement = await prisma.settlement.create({
      data: {
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amountMinorUnits: input.amountMinorUnits,
        currency: input.currency,
        note: input.note,
        settledAt: input.settledAt ? new Date(input.settledAt) : undefined,
        createdById: request.user.sub,
      },
    });

    const usersById = new Map(users.map((u) => [u.id, u]));
    return reply.code(201).send(toSettlementDTO(settlement, usersById));
  });

  app.get('/settlements', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = listSettlementsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { limit, offset, withUserId } = parsed.data;

    const requesterFilter: Prisma.SettlementWhereInput = {
      deletedAt: null,
      OR: [{ fromUserId: request.user.sub }, { toUserId: request.user.sub }],
    };
    const where: Prisma.SettlementWhereInput = withUserId
      ? {
          AND: [
            requesterFilter,
            { OR: [{ fromUserId: withUserId }, { toUserId: withUserId }] } satisfies Prisma.SettlementWhereInput,
          ],
        }
      : requesterFilter;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({ where, orderBy: { settledAt: 'desc' }, take: limit, skip: offset }),
      prisma.settlement.count({ where }),
    ]);

    const usersById = await getUsersMapByIds(settlements.flatMap((s) => [s.fromUserId, s.toUserId]));
    return reply.send({ settlements: settlements.map((s) => toSettlementDTO(s, usersById)), total });
  });

  app.delete('/settlements/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await prisma.settlement.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [{ fromUserId: request.user.sub }, { toUserId: request.user.sub }],
      },
    });
    if (!existing) {
      return reply.code(404).send({ error: 'Settlement not found' });
    }

    await prisma.settlement.update({ where: { id }, data: { deletedAt: new Date() } });
    return reply.code(204).send();
  });
}
