import { z } from 'zod';

// Pre-set vars (from the shell, or CI) always win over .env file values.
try {
  process.loadEnvFile();
} catch {
  // No .env file present (e.g. CI, which supplies these as real env vars).
}

const envSchema = z.object({
  // TODO(dynamo-migration): dropped once expenses/settlements/balances cut
  // over off Postgres too — see the plan file's phase breakdown.
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  DYNAMODB_TABLE_NAME: z.string().min(1),
  // Set for DynamoDB Local (dev/test); unset in production, where the SDK
  // talks to the real AWS endpoint for the configured region.
  DYNAMODB_ENDPOINT: z.url().optional(),
  // Passed explicitly to DynamoDBClient rather than left to the SDK's
  // default provider chain — letting it search (IMDS, shared config files,
  // SSO, ...) is slow and was observed to hang for a long time locally.
  AWS_REGION: z.string().min(1),
  AWS_ACCESS_KEY_ID: z.string().min(1),
  AWS_SECRET_ACCESS_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
