import type { FastifyInstance } from 'fastify';
import { userSearchQuerySchema } from '@pooln/shared';
import { prisma } from '../lib/prisma.js';
import { toUserDTO } from '../lib/userDto.js';

export async function userRoutes(app: FastifyInstance) {
  app.get('/users/search', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = userSearchQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (!user) {
      return reply.code(404).send({ error: 'No user found with that email' });
    }

    return reply.send(toUserDTO(user));
  });
}
