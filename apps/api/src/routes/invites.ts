import type { FastifyInstance } from 'fastify';
import { MemberAlreadyInGroupError, addGroupMember, getGroupInviteByToken, getGroupWithMembers } from '../lib/groupRepo.js';
import { getUserById } from '../lib/userRepo.js';
import { dtoFor, isMember } from './groups.js';

export async function inviteRoutes(app: FastifyInstance) {
  app.get('/invites/:token', async (request, reply) => {
    const { token } = request.params as { token: string };

    const invite = await getGroupInviteByToken(token);
    if (!invite) {
      return reply.code(404).send({ error: 'This invite link is no longer valid' });
    }

    const result = await getGroupWithMembers(invite.groupId);
    if (!result) {
      return reply.code(404).send({ error: 'This invite link is no longer valid' });
    }

    const invitedBy = await getUserById(invite.createdById);
    return reply.send({
      groupId: result.group.id,
      groupName: result.group.name,
      invitedByDisplayName: invitedBy?.displayName ?? 'A Pooln user',
    });
  });

  app.post('/invites/:token/accept', { preHandler: app.authenticate }, async (request, reply) => {
    const { token } = request.params as { token: string };

    const invite = await getGroupInviteByToken(token);
    if (!invite) {
      return reply.code(404).send({ error: 'This invite link is no longer valid' });
    }

    const result = await getGroupWithMembers(invite.groupId);
    if (!result) {
      return reply.code(404).send({ error: 'This invite link is no longer valid' });
    }

    if (!isMember(result, request.user.sub)) {
      try {
        await addGroupMember(invite.groupId, request.user.sub);
      } catch (err) {
        if (!(err instanceof MemberAlreadyInGroupError)) throw err;
      }
    }

    const updated = await getGroupWithMembers(invite.groupId);
    return reply.send(await dtoFor(updated!));
  });
}
