import type { UserDTO } from '@pooln/shared';
import { apiFetch, ApiError } from './client';

export async function searchUserByEmail(email: string): Promise<UserDTO | null> {
  try {
    return await apiFetch<UserDTO>(`/users/search?email=${encodeURIComponent(email)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}
