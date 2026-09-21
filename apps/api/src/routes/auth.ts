import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, signupSchema, type AuthResponse, type AuthTokens } from '@pooln/shared';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateRefreshToken, hashRefreshToken } from '../lib/refreshToken.js';
import { toUserDTO } from '../lib/userDto.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { email, password, displayName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.code(409).send({ error: 'Email already in use' });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, displayName },
    });

    const tokens = await issueTokens(app, user.id);
    const body: AuthResponse = { ...tokens, user: toUserDTO(user) };
    return reply.code(201).send(body);
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email } });
    const valid = user ? await verifyPassword(user.passwordHash, password) : false;
    if (!user || !valid) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }

    const tokens = await issueTokens(app, user.id);
    const body: AuthResponse = { ...tokens, user: toUserDTO(user) };
    return reply.send(body);
  });

  app.post('/auth/refresh', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const tokenHash = hashRefreshToken(parsed.data.refreshToken);
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await issueTokens(app, stored.userId);
    return reply.send(tokens);
  });

  app.post('/auth/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const tokenHash = hashRefreshToken(parsed.data.refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    return reply.code(204).send();
  });
}

async function issueTokens(app: FastifyInstance, userId: string): Promise<AuthTokens> {
  const accessToken = app.jwt.sign({ sub: userId }, { expiresIn: '15m' });
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return { accessToken, refreshToken };
}
