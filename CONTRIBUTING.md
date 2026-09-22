# Contributing

## Prerequisites

- Node.js 22 (see `.nvmrc`) — `nvm use`
- [pnpm](https://pnpm.io) — `corepack enable` or `npm install -g pnpm`
- Docker (or a Docker-compatible runtime such as [Colima](https://github.com/abiosoft/colima)) for DynamoDB Local
- Expo Go app on your phone, or an iOS Simulator / Android Emulator, to run the mobile app

## Setup

```bash
# 1. Start DynamoDB Local
docker compose -f docker/docker-compose.yml up -d

# 2. Install dependencies
pnpm install

# 3. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# 4. Run the API (creates the local table automatically on first run)
pnpm --filter api dev

# 5. In another terminal, run the mobile app
pnpm --filter mobile start
```

Open the API health check at http://localhost:3000/health. In the mobile app, sign up for an account — you'll land on the (currently bare-bones) Account screen.

## Gotchas

- **Android Emulator networking**: the emulator can't reach the host via `localhost`. Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` in `apps/mobile/.env` when testing on the Android emulator. iOS Simulator and web both work with `localhost`.
- **Physical device**: use your machine's LAN IP instead of `localhost` (e.g. `http://192.168.1.23:3000`), and make sure your phone is on the same network.
- **Browsing local data**: [`dynamodb-admin`](https://www.npmjs.com/package/dynamodb-admin) (`npx dynamodb-admin`, with `DYNAMO_ENDPOINT=http://localhost:8000`) is a local GUI for browsing everything in the table — no separate DB client needed.
- **DynamoDB Local resets on restart**: it runs in-memory (`-inMemory`, no persisted volume — see `docker/docker-compose.yml` for why), so its data doesn't survive `docker compose down`/restarts. `apps/api dev`/`test` recreate the table automatically (`scripts/ensure-table.ts`) if it's missing, so this is rarely something you need to think about.
- **Upgraded an existing `apps/api/.env`?** No new variables were added for auth (`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` were already in `.env.example` from Phase 0) — just make sure your `.env` has real values, not the placeholders, before relying on tokens across restarts.

## Checks before opening a PR

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
```

CI runs the same three commands against DynamoDB Local on every PR.
