import type { AuthResponse, LoginInput, SignupInput, UpdateMeInput, UserDTO } from '@pooln/shared';
import { apiFetch } from './client';

export function signup(input: SignupInput) {
  return apiFetch<AuthResponse>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput) {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function logout(refreshToken: string) {
  return apiFetch<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export function fetchMe() {
  return apiFetch<UserDTO>('/me');
}

export function updateMe(input: UpdateMeInput) {
  return apiFetch<UserDTO>('/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
