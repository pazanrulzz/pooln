import { z } from 'zod';
import { currencySchema } from './auth';

export const createSettlementSchema = z
  .object({
    fromUserId: z.uuid(),
    toUserId: z.uuid(),
    amountMinorUnits: z.number().int().positive(),
    currency: currencySchema,
    note: z.string().trim().max(280).optional(),
    settledAt: z.iso.datetime().optional(),
  })
  .refine((data) => data.fromUserId !== data.toUserId, {
    message: 'fromUserId and toUserId must be different',
    path: ['toUserId'],
  });
export type CreateSettlementInput = z.infer<typeof createSettlementSchema>;

export const listSettlementsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  withUserId: z.uuid().optional(),
});
export type ListSettlementsQuery = z.infer<typeof listSettlementsQuerySchema>;

export interface SettlementDTO {
  id: string;
  fromUserId: string;
  fromDisplayName: string;
  toUserId: string;
  toDisplayName: string;
  amountMinorUnits: number;
  currency: string;
  note: string | null;
  settledAt: string;
  createdById: string;
  createdAt: string;
}

export interface ListSettlementsResponse {
  settlements: SettlementDTO[];
  total: number;
}
