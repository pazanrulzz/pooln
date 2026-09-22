import type {
  AddGroupMemberInput,
  CreateGroupInput,
  GroupDTO,
  ListGroupsResponse,
  UpdateGroupInput,
} from '@pooln/shared';
import { apiFetch } from './client';

export function createGroup(input: CreateGroupInput) {
  return apiFetch<GroupDTO>('/groups', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function listGroups() {
  return apiFetch<ListGroupsResponse>('/groups');
}

export function getGroup(id: string) {
  return apiFetch<GroupDTO>(`/groups/${id}`);
}

export function updateGroup(id: string, input: UpdateGroupInput) {
  return apiFetch<GroupDTO>(`/groups/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function addGroupMember(id: string, input: AddGroupMemberInput) {
  return apiFetch<GroupDTO>(`/groups/${id}/members`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeGroupMember(id: string, userId: string) {
  return apiFetch<void>(`/groups/${id}/members/${userId}`, { method: 'DELETE' });
}

export function deleteGroup(id: string) {
  return apiFetch<void>(`/groups/${id}`, { method: 'DELETE' });
}
