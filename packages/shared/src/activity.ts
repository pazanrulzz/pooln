import { z } from 'zod';
import type { ExpenseDTO } from './expenses';
import type { SettlementDTO } from './settlements';

export const listActivityQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(30),
});
export type ListActivityQuery = z.infer<typeof listActivityQuerySchema>;

export type ActivityItemDTO =
  | { type: 'expense_created'; timestamp: string; expense: ExpenseDTO }
  | { type: 'expense_updated'; timestamp: string; expense: ExpenseDTO }
  | { type: 'settlement_created'; timestamp: string; settlement: SettlementDTO };

export interface ListActivityResponse {
  items: ActivityItemDTO[];
}
