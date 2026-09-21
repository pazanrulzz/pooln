import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import type { HealthStatus } from '@pooln/shared';
import { env } from './lib/env.js';
import { authRoutes } from './routes/auth.js';
import { meRoutes } from './routes/me.js';

export function buildServer() {
  const app = Fastify({ logger: true });

  // Native mobile clients aren't subject to CORS, but Expo web (and any
  // browser-based client) needs this for local development.
  app.register(cors, { origin: true });

  app.register(jwt, { secret: env.JWT_ACCESS_SECRET });

  app.decorate('authenticate', async (request, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  app.get('/health', async (): Promise<HealthStatus> => {
    return { status: 'ok' };
  });

  app.register(authRoutes);
  app.register(meRoutes);

  return app;
}

async function main() {
  const app = buildServer();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main();
}
