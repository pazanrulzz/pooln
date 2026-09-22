import { QueryCommand, type QueryCommandInput } from '@aws-sdk/lib-dynamodb';
import { dynamo } from './dynamo.js';

/**
 * Loops LastEvaluatedKey to exhaustion. A hand-rolled single-page Query
 * silently drops data once a user's matching items cross DynamoDB's ~1MB
 * per-page limit — unlikely at this app's scale today, but a query that's
 * meant to return "everything matching" should actually do that.
 */
export async function queryAllPages<T>(input: Omit<QueryCommandInput, 'ExclusiveStartKey'>): Promise<T[]> {
  const items: T[] = [];
  let exclusiveStartKey: Record<string, unknown> | undefined;

  do {
    const res = await dynamo.send(new QueryCommand({ ...input, ExclusiveStartKey: exclusiveStartKey }));
    items.push(...((res.Items ?? []) as T[]));
    exclusiveStartKey = res.LastEvaluatedKey;
  } while (exclusiveStartKey);

  return items;
}
