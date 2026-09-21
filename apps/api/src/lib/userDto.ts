import type { User } from '@prisma/client';
import type { UserDTO } from '@pooln/shared';

export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    defaultCurrency: user.defaultCurrency,
  };
}
