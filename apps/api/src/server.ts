import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import type { HealthStatus } from '@pooln/shared';

export function buildServer() {
  const app = Fastify({ logger: true });

  // Native mobile clients aren't subject to CORS, but Expo web (and any
  // browser-based client) needs this for local development.
  app.register(cors, { origin: true });

  app.get('/health', async (): Promise<HealthStatus> => {
    return { status: 'ok' };
  });

  return app;
}

async function main() {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3000);

  try {
    await app.listen({ port, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  main();
}
