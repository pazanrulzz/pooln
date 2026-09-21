import type { UserDTO } from '@pooln/shared';
import type { UserItem } from './items.js';

export function toUserDTO(user: UserItem): UserDTO {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    defaultCurrency: user.defaultCurrency,
  };
}
