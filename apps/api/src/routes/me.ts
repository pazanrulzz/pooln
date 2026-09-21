import type { FastifyInstance } from 'fastify';
import { updateMeSchema } from '@pooln/shared';
import { toUserDTO } from '../lib/userDto.js';
import { getUserById, updateUser } from '../lib/userRepo.js';

export async function meRoutes(app: FastifyInstance) {
  app.get('/me', { preHandler: app.authenticate }, async (request, reply) => {
    const user = await getUserById(request.user.sub);
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

    const user = await updateUser(request.user.sub, parsed.data);
    return reply.send(toUserDTO(user));
  });
}
