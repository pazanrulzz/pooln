# Contributing

## Prerequisites

- Node.js 22 (see `.nvmrc`) — `nvm use`
- [pnpm](https://pnpm.io) — `corepack enable` or `npm install -g pnpm`
- Docker (or a Docker-compatible runtime such as [Colima](https://github.com/abiosoft/colima)) — only needed to run the test suite, see below
- Access to a DynamoDB table in AWS (`pnpm dev` talks to it directly — see below if you'd rather not use a real AWS account)
- Expo Go app on your phone, or an iOS Simulator / Android Emulator, to run the mobile app

## Setup

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

Open the API health check at http://localhost:3000/health. In the mobile app, sign up for an account — you'll land on the (currently bare-bones) Account screen.

**Don't have an AWS account, or don't want `dev` touching real data?** Run `docker compose -f docker/docker-compose.yml up -d`, then `tsx apps/api/scripts/ensure-table.ts` (dummy `AWS_REGION`/`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` values are fine — DynamoDB Local doesn't check them), then set `DYNAMODB_ENDPOINT="http://localhost:8000"` in `apps/api/.env` before running `pnpm --filter api dev`. This is exactly what `pnpm test` already does for you automatically, every run — see below.

## Gotchas

- **Android Emulator networking**: the emulator can't reach the host via `localhost`. Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` in `apps/mobile/.env` when testing on the Android emulator. iOS Simulator and web both work with `localhost`.
- **Physical device**: use your machine's LAN IP instead of `localhost` (e.g. `http://192.168.1.23:3000`), and make sure your phone is on the same network.
- **Tests never touch the real table**: `pnpm --filter api test` always forces `DYNAMODB_ENDPOINT` to `http://localhost:8000` itself and creates the table automatically (`scripts/ensure-table.ts`), regardless of what's in `.env` — so running the test suite can never read/write real data, even if `dev` is currently pointed at the cloud. This means Docker only needs to be running when you run tests, not for everyday `pnpm dev` use.
- **Browsing data**: [`dynamodb-admin`](https://www.npmjs.com/package/dynamodb-admin) (`npx dynamodb-admin`) is a local GUI for browsing everything in a table — point it at your cloud table with real credentials, or at DynamoDB Local with `DYNAMO_ENDPOINT=http://localhost:8000`.
- **DynamoDB Local resets on restart**: it runs in-memory (`-inMemory`, no persisted volume — see `docker/docker-compose.yml` for why), so its data doesn't survive `docker compose down`/restarts. Only matters if you've opted into using it for `dev` (see above) — the test suite recreates its table every run regardless.
- **Upgraded an existing `apps/api/.env`?** No new variables were added for auth (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` were already in `.env.example` from Phase 0) — just make sure your `.env` has real values, not the placeholders, before relying on tokens across restarts.

## Checks before opening a PR

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
```

CI runs the same three commands against DynamoDB Local on every PR — never against a real table.
