import type { FastifyInstance } from 'fastify';
import { loginSchema, refreshSchema, signupSchema, type AuthResponse, type AuthTokens } from '@pooln/shared';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { generateRefreshToken, hashRefreshToken } from '../lib/refreshToken.js';
import {
  createRefreshToken,
  getRefreshToken,
  revokeRefreshToken,
  revokeRefreshTokenIfActive,
} from '../lib/refreshTokenRepo.js';
import { toUserDTO } from '../lib/userDto.js';
import { createUser, EmailAlreadyInUseError, getUserByEmail } from '../lib/userRepo.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/signup', async (request, reply) => {
    const parsed = signupSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }
    const { email, password, displayName } = parsed.data;

    const passwordHash = await hashPassword(password);
    let user;
    try {
      user = await createUser({ email, passwordHash, displayName });
    } catch (err) {
      if (err instanceof EmailAlreadyInUseError) {
        return reply.code(409).send({ error: 'Email already in use' });
      }
      throw err;
    }

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

    const user = await getUserByEmail(email);
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
    const stored = await getRefreshToken(tokenHash);

    if (!stored || stored.revokedAt || new Date(stored.expiresAt) < new Date()) {
      return reply.code(401).send({ error: 'Invalid or expired refresh token' });
    }

    await revokeRefreshToken(tokenHash);

    const tokens = await issueTokens(app, stored.userId);
    return reply.send(tokens);
  });

  app.post('/auth/logout', async (request, reply) => {
    const parsed = refreshSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', issues: parsed.error.issues });
    }

    const tokenHash = hashRefreshToken(parsed.data.refreshToken);
    await revokeRefreshTokenIfActive(tokenHash);

    return reply.code(204).send();
  });
}

async function issueTokens(app: FastifyInstance, userId: string): Promise<AuthTokens> {
  const accessToken = app.jwt.sign({ sub: userId }, { expiresIn: '15m' });
  const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

  await createRefreshToken({ userId, tokenHash, expiresAt });

  return { accessToken, refreshToken };
}
