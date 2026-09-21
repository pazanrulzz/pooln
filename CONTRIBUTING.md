# Contributing

## Prerequisites

- Node.js 22 (see `.nvmrc`) — `nvm use`
- [pnpm](https://pnpm.io) — `corepack enable` or `npm install -g pnpm`
- Docker (or a Docker-compatible runtime such as [Colima](https://github.com/abiosoft/colima)) for local Postgres
- Expo Go app on your phone, or an iOS Simulator / Android Emulator, to run the mobile app

## Setup

```bash
# 1. Start Postgres
docker compose -f docker/docker-compose.yml up -d

# 2. Install dependencies
pnpm install

# 3. Copy env files
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env

# 4. Generate the Prisma client
pnpm --filter api prisma:generate

# 5. Run the API
pnpm --filter api dev

# 6. In another terminal, run the mobile app
pnpm --filter mobile start
```

Open the API health check at http://localhost:3000/health, and open the mobile app in Expo Go / a simulator — the Home screen calls that same endpoint.

## Gotchas

- **Android Emulator networking**: the emulator can't reach the host via `localhost`. Set `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000` in `apps/mobile/.env` when testing on the Android emulator. iOS Simulator and web both work with `localhost`.
- **Physical device**: use your machine's LAN IP instead of `localhost` (e.g. `http://192.168.1.23:3000`), and make sure your phone is on the same network.
- **Prisma Studio**: `pnpm --filter api prisma:studio` opens a local GUI for browsing the database — no separate DB client needed.

## Checks before opening a PR

```bash
pnpm -r typecheck
pnpm -r lint
pnpm -r test
```

CI runs the same three commands against a Postgres service container on every PR.
