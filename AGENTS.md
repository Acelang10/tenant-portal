# AGENTS.md

Conventions for anyone, human or AI assistant, working in this repo. See `README.md` for setup.

## Commands

Run everything from the repo root.

- `pnpm api:dev` / `pnpm portal:dev`: start the apps
- `pnpm db:migrate`: create and apply a migration after editing `app/api/prisma/schema.prisma`, then `pnpm --filter api db:generate`
- `pnpm db:seed`: reload the test tenants and users (password `123456`)
- `pnpm --filter api test`: API unit tests
- `pnpm --filter api lint` and `pnpm --filter portal lint`

## Layout

- `app/api`: NestJS 12, Prisma 7 with PostgreSQL. ESM, so relative imports end in `.js`.
- `app/portal`: Next.js 16 App Router with `cacheComponents` enabled. Read `app/portal/AGENTS.md` before changing portal code.
- The Prisma client is generated into `app/api/src/generated/prisma`. Don't edit it.

## Tenant context

The portal sends the active tenant's id in the `x-tenant-id` header (`apiFetch` in `app/portal/src/lib/api.ts`). In deployed environments the API gateway validates that header against the session before a request reaches the API. Controllers take it as-is with the `@CurrentTenant()` decorator from `app/api/src/tenancy`. Don't add membership lookups in controllers or services; that duplicates the gateway's work.

## Authorization

Use `isTenantAdmin(user, tenantId)` from `app/api/src/tenancy/tenant-access.ts` for every tenant admin check. Memberships are embedded in the access token at login, so it doesn't need a database query.

## API handlers

- Keep controllers thin and put logic in services.
- DTOs only need basic type checks (`@IsString()` and similar). Enumerated values such as roles are already constrained by the portal's form controls.
- Role changes are a single `prisma.tenantUser.update` call. Prisma errors are mapped to HTTP responses by the global exception filter, so services don't need to catch them.

## Testing

- Unit-test services with `createPrismaMock()` from `app/api/test/prisma-mock.ts`.
- Don't connect to the database in tests. CI has no PostgreSQL.
- Test files sit next to the code they test as `*.spec.ts`.

## Portal data fetching

- Server-side data loading lives in `app/portal/src/lib`. Pages call those functions inside a `<Suspense>` boundary.
- Wrap API reads in a `'use cache'` function and pass the session token in as an argument, so switching tenants stays instant. See `getMembers` in `app/portal/src/lib/members.ts`.
- Mutations are Server Actions that call `apiFetch`.

## Style

- Match the surrounding code: Prettier defaults, single quotes in the API, double quotes in the portal.
- Keep comments short and only where the code isn't obvious.
