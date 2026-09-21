import type { FastifyInstance } from 'fastify';
import { updateMeSchema } from '@pooln/shared';
import { prisma } from '../lib/prisma.js';
import { toUserDTO } from '../lib/userDto.js';

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({ where: { id: request.user.sub } });
    if (!user) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    return reply.send(toUserDTO(user));
  });

  app.patch('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = updateMeSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const user = await prisma.user.update({
      where: { id: request.user.sub },
      data: parsed.data,
    });
    return reply.send(toUserDTO(user));
  });
}
