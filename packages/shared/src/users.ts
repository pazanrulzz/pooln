import { z } from 'zod';
import { emailSchema } from './auth';

export const userSearchQuerySchema = z.object({
  email: emailSchema,
});
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
