/**
 * Idempotently creates the app's DynamoDB table against DynamoDB Local,
 * matching the schema of the real AWS `poolnDB` table exactly (PK/SK
 * String, one GSI1PK/GSI1SK index with ProjectionType ALL, PAY_PER_REQUEST
 * billing). Run automatically by the `test` script — `dev` talks to the
 * real cloud table directly and doesn't need this at all. Never runs
 * against real AWS, see the guard below — the real table is provisioned by
 * hand, not by this script.
 */
import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  ResourceNotFoundException,
} from '@aws-sdk/client-dynamodb';
import { env } from '../src/lib/env.js';

if (!env.DYNAMODB_ENDPOINT) {
  console.error(
    'DYNAMODB_ENDPOINT is not set. This script creates tables and is only meant to run ' +
      'against DynamoDB Local (dev/test) — the real AWS table is provisioned by hand, not ' +
      'by this script. Refusing to run without an explicit local endpoint.',
  );
  process.exit(1);
}

const client = new DynamoDBClient({
  endpoint: env.DYNAMODB_ENDPOINT,
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

async function describeWithRetry(retries = 20, delayMs = 500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await client.send(new DescribeTableCommand({ TableName: env.DYNAMODB_TABLE_NAME }));
    } catch (err) {
      if (err instanceof ResourceNotFoundException) return null; // reachable, table just doesn't exist
      if (attempt === retries) throw err;
      // amazon/dynamodb-local ships no HEALTHCHECK, so the container may not
      // be accepting connections yet right after `docker compose up`.
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return null;
}

async function ensureTable() {
  const existing = await describeWithRetry();
  if (existing) {
    console.log(`DynamoDB table "${env.DYNAMODB_TABLE_NAME}" already exists.`);
    return;
  }

  try {
    await client.send(
      new CreateTableCommand({
        TableName: env.DYNAMODB_TABLE_NAME,
        BillingMode: 'PAY_PER_REQUEST',
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
        ],
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
          },
        ],
      }),
    );
    console.log(`Created DynamoDB table "${env.DYNAMODB_TABLE_NAME}".`);
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`DynamoDB table "${env.DYNAMODB_TABLE_NAME}" already being created, continuing.`);
      return;
    }
    throw err;
  }
}

ensureTable().catch((err: unknown) => {
  console.error('Failed to ensure DynamoDB table:', err);
  process.exit(1);
});
