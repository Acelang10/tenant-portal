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

The portal sends the tenant the user selected in the `x-tenant-id` header (`apiFetch` in `app/portal/src/lib/api.ts`). That header is only a selector: the API must not trust it. Guard tenant-scoped routes with `@UseGuards(AuthGuard, TenantGuard)`. `TenantGuard` (`app/api/src/tenancy/tenant.guard.ts`) looks up the signed-in user's membership in that tenant in the database and returns 403 if there is none. Controllers then read the validated tenant and role with `@CurrentTenant()`. Scope every query by that tenant id.

## Authorization

Use `isTenantAdmin(tenant)` from `app/api/src/tenancy/tenant-access.ts` with the context from `@CurrentTenant()`. The role comes from the database, not the access token, so role changes apply immediately. The token only carries `sub` and `username`.

## API handlers

- Keep controllers thin and put logic in services.
- Validate every payload fully on the server, including enumerated values such as roles (`@IsEnum`). Form controls in the portal are not a security boundary.
- There is no global Prisma exception filter. Check for missing records and throw Nest HTTP exceptions (`NotFoundException`, etc.) yourself so clients get a proper status and message.
- Role changes run in a transaction that locks the tenant row (see `MembersService.updateRole`), so concurrent changes can't leave a tenant without an admin.

## Testing

- Unit-test services with `createPrismaMock()` from `app/api/test/prisma-mock.ts`. `useTenantUsers()` in `app/api/test/tenant-users-fixture.ts` backs it with an in-memory membership table for authorization and tenant-isolation tests.
- Don't connect to the database in tests. CI has no PostgreSQL.
- Test files sit next to the code they test as `*.spec.ts`.

## Portal data fetching

- Server-side data loading lives in `app/portal/src/lib`. Pages call those functions inside a `<Suspense>` boundary.
- Don't put authorization-dependent API reads (such as the member list) in `'use cache'`: a cached result can outlive a role change or revoked access. `getMembers` in `app/portal/src/lib/members.ts` fetches per request.
- Mutations are Server Actions that call `apiFetch`.

## Style

- Match the surrounding code: Prettier defaults, single quotes in the API, double quotes in the portal.
- Keep comments short and only where the code isn't obvious.
