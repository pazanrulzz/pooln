import { z } from 'zod';
import { currencySchema } from './auth';
import type { SplitType } from './splitCalc';

export const splitTypeSchema = z.enum(['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES']) satisfies z.ZodType<SplitType>;

const expenseParticipantInputSchema = z.object({
  userId: z.uuid(),
  value: z.number().optional(),
});

export const createExpenseSchema = z
  .object({
    description: z.string().trim().min(1).max(140),
    amountMinorUnits: z.number().int().positive(),
    currency: currencySchema.optional(),
    splitType: splitTypeSchema,
    payerId: z.uuid(),
    date: z.iso.datetime().optional(),
    notes: z.string().trim().max(1000).optional(),
    // TransactWriteItems caps at 100 items/transaction; a create/update
    // writes 1 metadata item + N participant items.
    participants: z.array(expenseParticipantInputSchema).min(2).max(99),
  })
  .refine(
    (data) => new Set(data.participants.map((p) => p.userId)).size === data.participants.length,
    { message: 'Each participant can only appear once', path: ['participants'] },
  )
  .refine((data) => data.participants.some((p) => p.userId === data.payerId), {
    message: 'The payer must be one of the participants',
    path: ['payerId'],
  });
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;

// Same shape as create — an edit is a full replace, not a partial patch,
// since amount/splitType/participants are interrelated.
export const updateExpenseSchema = createExpenseSchema;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

export const listExpensesQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  withUserId: z.uuid().optional(),
});
export type ListExpensesQuery = z.infer<typeof listExpensesQuerySchema>;

export interface ExpenseParticipantDTO {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  paidAmountMinorUnits: number;
  owedAmountMinorUnits: number;
  sharePercentBp: number | null;
  shareUnits: number | null;
}

export interface ExpenseDTO {
  id: string;
  description: string;
  amountMinorUnits: number;
  currency: string;
  splitType: SplitType;
  payerId: string;
  date: string;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  participants: ExpenseParticipantDTO[];
}

export interface ListExpensesResponse {
  expenses: ExpenseDTO[];
  total: number;
}
