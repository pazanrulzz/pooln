import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  memberIds: z.array(z.uuid()).max(99).default([]),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
});
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;

export const addGroupMemberSchema = z.object({
  userId: z.uuid(),
});
export type AddGroupMemberInput = z.infer<typeof addGroupMemberSchema>;

export interface GroupMemberDTO {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface GroupDTO {
  id: string;
  name: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMemberDTO[];
}

export interface ListGroupsResponse {
  groups: GroupDTO[];
}
