import type { GroupDTO, GroupInviteDTO, InvitePreviewDTO } from '@pooln/shared';
import { apiFetch } from './client';

export function createGroupInvite(groupId: string) {
  return apiFetch<GroupInviteDTO>(`/groups/${groupId}/invite`, { method: 'POST' });
}

export function revokeGroupInvite(groupId: string) {
  return apiFetch<void>(`/groups/${groupId}/invite`, { method: 'DELETE' });
}

export function getInvitePreview(token: string) {
  return apiFetch<InvitePreviewDTO>(`/invites/${token}`);
}

export function acceptInvite(token: string) {
  return apiFetch<GroupDTO>(`/invites/${token}/accept`, { method: 'POST' });
}
