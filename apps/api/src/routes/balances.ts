import type { FastifyInstance } from 'fastify';
import { computeBalances } from '../lib/balances.js';
import { prisma } from '../lib/prisma.js';

export async function balanceRoutes(app: FastifyInstance) {
  app.get('/balances', { preHandler: app.authenticate }, async (request, reply) => {
    const balances = await computeBalances(request.user.sub);
    return reply.send(balances);
  });

  app.get('/balances/:userId', { preHandler: app.authenticate }, async (request, reply) => {
    const { userId } = request.params as { userId: string };

    const counterpart = await prisma.user.findUnique({ where: { id: userId } });
    if (!counterpart) {
      return reply.code(404).send({ error: 'User not found' });
    }

    const balances = await computeBalances(request.user.sub, userId);
    const existing = balances.find((b) => b.userId === userId);

    return reply.send(
      existing ?? {
        userId,
        displayName: counterpart.displayName,
        avatarUrl: counterpart.avatarUrl,
        balances: [],
      },
    );
  });
}
