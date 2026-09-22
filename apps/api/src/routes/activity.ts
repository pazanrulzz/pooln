import type { FastifyInstance } from 'fastify';
import { listActivityQuerySchema } from '@pooln/shared';
import { getRecentActivity } from '../lib/activity.js';

export async function activityRoutes(app: FastifyInstance) {
  app.get('/activity', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = listActivityQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const items = await getRecentActivity(request.user.sub, parsed.data.limit);
    return reply.send({ items });
  });
}
