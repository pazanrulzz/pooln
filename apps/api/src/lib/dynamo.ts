import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { env } from './env.js';

const client = new DynamoDBClient({
  endpoint: env.DYNAMODB_ENDPOINT,
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

// removeUndefinedAttributes: several item fields (notes, avatarUrl,
// sharePercentBp, shareUnits, ...) are commonly undefined; the raw SDK
// throws on that by default instead of just omitting the attribute.
export const dynamo = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

export const TABLE_NAME = env.DYNAMODB_TABLE_NAME;
