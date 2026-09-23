import { z } from 'zod';

// Data URI, capped well under DynamoDB's 400KB item limit — a resized/compressed
// avatar (client sends ~400x400 JPEG) lands in the tens of KB, this just guards
// against something huge slipping through.
const avatarUrlSchema = z
  .string()
  .max(280_000)
  .refine((v) => v.startsWith('data:image/'), { message: 'avatarUrl must be a data:image/... URI' });

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  memberIds: z.array(z.uuid()).max(99).default([]),
  avatarUrl: avatarUrlSchema.nullable().optional(),
});
export type CreateGroupInput = z.infer<typeof createGroupSchema>;

export const updateGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    avatarUrl: avatarUrlSchema.nullable().optional(),
  })
  .refine((data) => data.name !== undefined || data.avatarUrl !== undefined, {
    message: 'Provide at least one field to update',
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
  avatarUrl: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMemberDTO[];
}

export interface ListGroupsResponse {
  groups: GroupDTO[];
}
