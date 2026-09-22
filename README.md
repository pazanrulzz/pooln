# Pooln

An open-source expense-splitting app — track shared expenses with friends and groups, split bills, and settle up. Inspired by Splitwise.

## Status

Early scaffolding. No features yet — see [CONTRIBUTING.md](./CONTRIBUTING.md) to get the stack running locally.

## Stack

- **Mobile**: React Native + [Expo](https://expo.dev) (TypeScript), [expo-router](https://docs.expo.dev/router/introduction/)
- **API**: [Fastify](https://fastify.dev) (TypeScript)
- **Database**: DynamoDB (single-table design; DynamoDB Local for dev/test)
- **Monorepo**: pnpm workspaces (`apps/mobile`, `apps/api`, `packages/shared`)

## Structure

```
apps/
  mobile/     Expo app
  api/        Fastify API
packages/
  shared/     Types, validation schemas, and business logic shared between mobile and api
docker/
  docker-compose.yml   Local DynamoDB
```

## License

[MIT](./LICENSE)
