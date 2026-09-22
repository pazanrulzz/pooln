import type { FastifyInstance } from 'fastify';
import { createSettlementSchema, listSettlementsQuerySchema } from '@pooln/shared';
import { toSettlementDTO } from '../lib/settlementDto.js';
import { createSettlement, getSettlementParties, getSettlementPartiesForUser, softDeleteSettlement } from '../lib/settlementRepo.js';
import { getUsersByIds } from '../lib/userRepo.js';

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
    const usersById = new Map(users.map((u) => [u.id, u]));

    const [settlement] = await createSettlement({
      fromUserId: input.fromUserId,
      fromDisplayName: usersById.get(input.fromUserId)!.displayName,
      toUserId: input.toUserId,
      toDisplayName: usersById.get(input.toUserId)!.displayName,
      amountMinorUnits: input.amountMinorUnits,
      currency: input.currency,
      note: input.note ?? null,
      settledAt: input.settledAt,
      createdById: request.user.sub,
    });

    return reply.code(201).send(toSettlementDTO(settlement!));
  });

  app.get('/settlements', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = listSettlementsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { limit, offset, withUserId } = parsed.data;

    const all = await getSettlementPartiesForUser(request.user.sub, withUserId);
    const page = all.slice(offset, offset + limit);

    return reply.send({ settlements: page.map(toSettlementDTO), total: all.length });
  });

  app.delete('/settlements/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const existing = await getSettlementParties(id);
    const isParty = existing?.some((s) => s.fromUserId === request.user.sub || s.toUserId === request.user.sub);
    if (!existing || !isParty) {
      return reply.code(404).send({ error: 'Settlement not found' });
    }

    await softDeleteSettlement(id);
    return reply.code(204).send();
  });
}
