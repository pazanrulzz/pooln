import type { GroupDTO } from '@pooln/shared';
import type { GroupItem, GroupMemberItem, UserItem } from './items.js';

export function toGroupDTO(group: GroupItem, members: GroupMemberItem[], usersById: Map<string, UserItem>): GroupDTO {
  return {
    id: group.id,
    name: group.name,
    createdById: group.createdById,
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
    members: members.map((member) => {
      const user = usersById.get(member.userId);
      return {
        userId: member.userId,
        displayName: user?.displayName ?? 'Unknown user',
        avatarUrl: user?.avatarUrl ?? null,
      };
    }),
  };
}
