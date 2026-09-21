import { z } from 'zod';

export const emailSchema = z.email().trim().toLowerCase();
export const passwordSchema = z.string().min(8).max(72);
export const displayNameSchema = z.string().trim().min(1).max(80);
export const currencySchema = z.string().length(3);

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: displayNameSchema,
});
export type SignupInput = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshInput = z.infer<typeof refreshSchema>;

export const updateMeSchema = z
  .object({
    displayName: displayNameSchema,
    defaultCurrency: currencySchema,
    avatarUrl: z.url().nullable(),
  })
  .partial();
export type UpdateMeInput = z.infer<typeof updateMeSchema>;

export interface UserDTO {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  defaultCurrency: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse extends AuthTokens {
  user: UserDTO;
}
