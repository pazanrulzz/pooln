import { z } from 'zod';

// Pre-set vars (from the shell, or CI) always win over .env file values.
try {
  process.loadEnvFile();
} catch {
  // No .env file present (e.g. CI, which supplies these as real env vars).
}

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
});

export const env = envSchema.parse(process.env);
