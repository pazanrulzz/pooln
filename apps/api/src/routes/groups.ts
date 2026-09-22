import type { FastifyInstance } from 'fastify';
import { addGroupMemberSchema, createGroupSchema, updateGroupSchema } from '@pooln/shared';
import { toGroupDTO } from '../lib/groupDto.js';
import {
  MemberAlreadyInGroupError,
  addGroupMember,
  createGroup,
  getGroupWithMembers,
  getGroupsForUser,
  getOrCreateGroupInvite,
  removeGroupMember,
  renameGroup,
  revokeGroupInvite,
  softDeleteGroup,
  type GroupWithMembers,
} from '../lib/groupRepo.js';
import { getUserById, getUsersMapByIds } from '../lib/userRepo.js';

export async function dtoFor({ group, members }: GroupWithMembers) {
  const usersById = await getUsersMapByIds(members.map((m) => m.userId));
  return toGroupDTO(group, members, usersById);
}

export function isMember(result: GroupWithMembers, userId: string) {
  return result.members.some((m) => m.userId === userId);
}

export async function groupRoutes(app: FastifyInstance) {
  app.post('/groups', { preHandler: app.authenticate }, async (request, reply) => {
    const parsed = createGroupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const result = await createGroup({
      name: parsed.data.name,
      createdById: request.user.sub,
      memberIds: parsed.data.memberIds,
    });
    return reply.code(201).send(await dtoFor(result));
  });

  app.get('/groups', { preHandler: app.authenticate }, async (request, reply) => {
    const groups = await getGroupsForUser(request.user.sub);
    const usersById = await getUsersMapByIds(groups.flatMap((g) => g.members.map((m) => m.userId)));
    return reply.send({ groups: groups.map((g) => toGroupDTO(g.group, g.members, usersById)) });
  });

  app.get('/groups/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getGroupWithMembers(id);
    if (!result || !isMember(result, request.user.sub)) {
      return reply.code(404).send({ error: 'Group not found' });
    }
    return reply.send(await dtoFor(result));
  });

  app.patch('/groups/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getGroupWithMembers(id);
    if (!result || !isMember(result, request.user.sub)) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const parsed = updateGroupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const group = await renameGroup(id, parsed.data.name);
    return reply.send(await dtoFor({ group, members: result.members }));
  });

  app.post('/groups/:id/members', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getGroupWithMembers(id);
    if (!result || !isMember(result, request.user.sub)) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const parsed = addGroupMemberSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const newUser = await getUserById(parsed.data.userId);
    if (!newUser) {
      return reply.code(400).send({ error: 'User does not exist' });
    }

    try {
      await addGroupMember(id, parsed.data.userId);
    } catch (err) {
      if (err instanceof MemberAlreadyInGroupError) {
        return reply.code(409).send({ error: err.message });
      }
      throw err;
    }

    const updated = await getGroupWithMembers(id);
    return reply.code(201).send(await dtoFor(updated!));
  });

  app.delete('/groups/:id/members/:userId', { preHandler: app.authenticate }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const result = await getGroupWithMembers(id);
    if (!result || !isMember(result, request.user.sub)) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    await removeGroupMember(id, userId);
    return reply.code(204).send();
  });

  app.delete('/groups/:id', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getGroupWithMembers(id);
    if (!result || !isMember(result, request.user.sub)) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    await softDeleteGroup(id);
    return reply.code(204).send();
  });

  app.post('/groups/:id/invite', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getGroupWithMembers(id);
    if (!result || !isMember(result, request.user.sub)) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    const invite = await getOrCreateGroupInvite(id, request.user.sub);
    return reply.code(201).send({ token: invite.token });
  });

  app.delete('/groups/:id/invite', { preHandler: app.authenticate }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await getGroupWithMembers(id);
    if (!result || !isMember(result, request.user.sub)) {
      return reply.code(404).send({ error: 'Group not found' });
    }

    await revokeGroupInvite(id);
    return reply.code(204).send();
  });
}
