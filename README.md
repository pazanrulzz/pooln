# Pooln

An open-source expense-splitting app — track shared expenses with friends and groups, split bills, and settle up. Inspired by Splitwise.

## Status

Core loop is built: auth, expenses with 4 split methods, balances, settle-up, groups with shareable invite links, group-scoped expenses, and a recent activity feed.

## Stack

- **Mobile**: React Native + [Expo](https://expo.dev) (TypeScript), [expo-router](https://docs.expo.dev/router/introduction/)
- **API**: [Fastify](https://fastify.dev) (TypeScript)
- **Database**: DynamoDB (single-table design), the real AWS table — DynamoDB Local is used only for the automated test suite
- **Monorepo**: pnpm workspaces (`apps/mobile`, `apps/api`, `packages/shared`)

## Running the project

Prerequisites: Node.js 22 (see `.nvmrc`), [pnpm](https://pnpm.io), and access to a DynamoDB table in AWS (or Docker, if you'd rather run against a free local DynamoDB instead of a real AWS account — see the note below).

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# 3. Put real AWS credentials + your table's region/name in apps/api/.env
#    (AWS_REGION / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / DYNAMODB_TABLE_NAME)

# 4. Run the API
pnpm --filter api dev

# 5. In another terminal, run the mobile app
pnpm --filter mobile start
```

Open http://localhost:3000/health to confirm the API is up. Then open the mobile app — in Expo Go on your phone, an iOS Simulator/Android Emulator, or a browser via `pnpm --filter mobile web` — and sign up for an account to get started.

**Don't have an AWS account?** See [CONTRIBUTING.md](./CONTRIBUTING.md#setup) for running the whole app against a free local DynamoDB instead — no AWS account needed.

Run the test suite with `pnpm -r test` — it always runs against local DynamoDB automatically, never your real table, regardless of how `dev` above is configured. Full setup details, gotchas (Android emulator networking, browsing table data, etc.), and PR checks live in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Structure

```
apps/
  mobile/     Expo app
  api/        Fastify API
packages/
  shared/     Types, validation schemas, and business logic shared between mobile and api
docker/
  docker-compose.yml   Local DynamoDB, used by the test suite
```

## License

[MIT](./LICENSE)

FOR FRIENDS by FRIENDS ♡
