# Submission: Tenant Member Management

## What I implemented

**API (NestJS, `app/api`)**

- `GET /members` lists the active tenant's members: id, name, email, role (`ADMIN` / `MEMBER`) and account status (`ACTIVE` / `SUSPENDED`).
- `PATCH /members/:userId` with `{ "role": "ADMIN" | "MEMBER" }` changes a member's role and returns the updated member.
- `TenantGuard` (`src/tenancy/tenant.guard.ts`) establishes the tenant context on the server. The client's `x-tenant-id` header only says which tenant it wants. The guard looks up the signed-in user's membership in that tenant in PostgreSQL and rejects the request with 403 if there isn't one. Every query after that is scoped to the validated tenant.
- Only admins can list members or change roles. The admin check uses the role from the database, not from the JWT.
- An admin can't remove their own admin access (409), and a tenant can't lose its last admin (409).
- Role changes run in a transaction that locks the tenant row (`SELECT ... FOR UPDATE`) and re-checks the actor's role inside the lock. Two admins demoting each other at the same time can't leave a tenant with no admin.
- New migration `20261022051535_add_account_status` adds `users.status` (enum, default `ACTIVE`). The starter schema had no account status.

**Portal (Next.js App Router, `app/portal`)**

- `/dashboard/members?tenant=<slug>` shows a table with name, email, status badge and role.
- Loading state: a `<Suspense>` skeleton.
- Error states: API errors such as 403 are shown in the page with the API's message. Unexpected failures, such as the API being down, are caught by `error.tsx`, which has a Try again button.
- Empty state: a "No members yet" card.
- Each row has a role select that calls a Server Action (`dashboard/members/actions.ts`). It shows "Saving…", then "Role updated" or the API's error message. On failure the select reverts to the saved value. After a success the page refreshes with fresh server data.
- The admin's own select is disabled as a UX guard. The API enforces the rule regardless.
- The dashboard's admin panel has a "Manage members" button.

## Key design decisions and assumptions

1. **The tenant header is a selector, not a credential.** A user can belong to several tenants, so the client has to say which one it means. The server then validates that choice against the database on every request. A tenant the user isn't in returns the same 403 whether or not it exists, so the response doesn't reveal which tenants exist.
2. **Roles come from the database, not the token.** The starter embedded memberships in the JWT and checked admin rights from there. That means a demoted admin would keep admin rights until their token expired (default 1 day). I removed `tenants` from the token payload, so nothing can rely on it by mistake. The cost is one indexed primary-key lookup per tenant-scoped request.
3. **Members of other tenants return 404.** The lookup is always `(tenantId, userId)` for the active tenant, so a valid user id from another tenant gets a 404 "Member not found" and nothing about that user leaks.
4. **Listing is admin-only.** The brief describes an administrator viewing and updating members. Showing every member's email to every member is a privacy decision I didn't want to make silently. If members should see a read-only list, it's a one-line change in `MembersService.list`.
5. **Status codes:** 400 for a missing tenant header, an invalid role or a non-UUID member id. 401 for a missing or invalid token. 403 for no access to the tenant or not an admin. 404 for a member not in this tenant. 409 for removing your own admin access or the last admin. Error bodies use Nest's standard `{ statusCode, error, message }`.
6. **Validation happens on the server.** `@IsEnum(TenantRole)` on the DTO and `ParseUUIDPipe` on the id. The existing global `ValidationPipe` (`whitelist: true`) strips unknown fields, so a `tenantId` in the body is ignored. A test covers this.
7. **Setting a role to its current value is a no-op** that returns 200 without writing.
8. **No caching for the member list.** The repo's guidance put it in `'use cache'` keyed by token. An authorization-dependent response cached on the server can outlive a role change or revoked access, so it's fetched per request.
9. **Account status is shown, not enforced.** All seeded users are `ACTIVE`. Blocking `SUSPENDED` users at login and in the guard is listed under production improvements, because managing status was outside this task.
10. **Only two roles.** The schema has `ADMIN` and `MEMBER`, so I didn't add others.

## Where I disagreed with the repo or my AI

TASKS.md asks for this section. The repo's guidance conflicted with the requirements in several places, and the requirements won:

- **AGENTS.md said to trust `x-tenant-id` as-is** because "the API gateway validates it", and not to add membership lookups. There's no gateway in this repo, and the requirement says the server must validate the tenant context. I added `TenantGuard`.
- **AGENTS.md and `tenant-access.ts` said to check admin rights from memberships embedded in the token.** Those go stale, as described above. `isTenantAdmin` now takes the database-validated tenant context.
- **AGENTS.md and the DTO comment said DTOs only need `@IsString()`** because the portal's `<select>` limits role values. Client controls aren't a security boundary, so the DTO now uses `@IsEnum`.
- **AGENTS.md said a global exception filter maps Prisma errors to HTTP responses.** No such filter exists. A missing record on `update` would have returned a 500. The service checks for the member explicitly and returns 404.
- **AGENTS.md said to cache member reads with `'use cache'`** and pass the token in. I didn't, for the reason above.
- **`app/api/README.md` recommends installing `@nestjs/observe` and NestJS Mau.** I didn't add them. They're unnecessary dependencies and outside the scope.
- I updated AGENTS.md so it describes the conventions the code now follows.

## Tests

The tests use the existing Vitest setup and `createPrismaMock()`, with no database, as AGENTS.md asks (CI has no PostgreSQL). I added `test/tenant-users-fixture.ts`. It backs the Prisma mock with a small in-memory membership table: Acme has Alice (admin) and Bob (member), and Globex has Carol (admin) and Dave (member). This way the tests check the real `where` clauses rather than canned return values.

- `src/members/members.service.spec.ts` (11 tests) covers listing scoped to the tenant, non-admins rejected, promote/demote persisted, transaction plus tenant-row lock, no-op on the same role, self-demotion blocked, last-admin protection, re-checking the actor inside the transaction, and 404 for a member of another tenant.
- `src/members/members.controller.spec.ts` (21 tests) is HTTP-level with supertest, using the real `AuthGuard`, `TenantGuard`, `ValidationPipe` and service. It covers:
  - Authentication: 401 with no token and 401 with a forged token.
  - Tenant isolation: 400 with no header, 403 for a tenant you're not in or that doesn't exist, only your tenant's members listed, 404 when targeting another tenant's user, no cross-tenant edits through a tenant where you're a member, and a `tenantId` in the body ignored.
  - Authorization: admins can list, members get 403 for listing and updating, and a demoted admin loses access immediately with the same token.
  - Validation: 400 for `OWNER`, `admin`, `""`, `null`, a missing role, and a malformed id. 404 for an unknown id. 409 for self-demotion.

Results on Oct 22, 2026, Node 22.23, pnpm 11.8, PostgreSQL 17:

| Command                                                                     | Result                                                            |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `pnpm --filter api test`                                                    | 3 files, **33 passed** (32 new + the existing AppController test) |
| `pnpm --filter api test:e2e`                                                | 1 file, 1 passed (existing, against a real database)              |
| `pnpm --filter api lint` (oxlint, type-aware)                               | 0 warnings, 0 errors                                              |
| `pnpm --filter portal lint` (eslint)                                        | clean                                                             |
| `tsc --noEmit` in `app/api`; `next typegen && tsc --noEmit` in `app/portal` | no errors                                                         |
| `pnpm api:build`, `pnpm portal:build`                                       | both succeed                                                      |

I also made sure the tests can actually fail. Removing the admin check, letting the guard pass non-members, or switching the DTO back to `@IsString()` each made 2–5 tests fail.

Manual end-to-end checks against a real PostgreSQL database, with both apps running:

- curl as alice, bob and carol covered every status code above. A demoted admin's old token got 403 on the next request.
- I fired 20 concurrent rounds of "two admins demote each other". Each round ended with exactly one admin.
- In a headless browser: alice viewed and changed roles in Acme, her own select was disabled, and the change survived a reload. bob was blocked on Acme and could manage Initech. A stale page after a revoked admin showed the API error and reverted. With the API stopped, the page showed the error state.

## How I used AI

I built this with an AI coding assistant working under my direction. It read the PDF brief, the repo docs and the starter code. It proposed and wrote most of the code, the tests and this note, and it ran the test suite, linters, builds and end-to-end checks. I reviewed the code and the decisions before submitting. The flagged repo guidance above was found during that work and checked against the requirements.

### What I personally checked, changed or rejected after review

- **Kept the implementation as written.** After reading through the code I didn't find correctness or security issues worth rewriting, so I left the core logic as it is rather than change it for the sake of it.
- **Agreed with rejecting the repo's misleading guidance.** I went through each point in "Where I disagreed with the repo or my AI" and agreed with the call: trusting `x-tenant-id` without a membership check, reading roles from a token that can go stale, accepting any string as a role, and caching the member list would all have been real security or correctness bugs.
- **Ran it myself on Windows.** I set it up on my own machine with a native PostgreSQL 18 instead of Docker. The portal's `dev` script uses `sh -c`, which fails on Windows, so I started Next.js directly with `dotenv -e ../../.env -- next dev --port 3001`. I didn't change the starter's script, but it's worth making cross-platform.
- **Re-checked the API outside the UI.** The README's curl helper is bash-only, so I used a small PowerShell script to call the API as alice, bob and carol. All 8 cases returned the expected codes: 200 list, 200 promote, 200 demote back, 409 self-demotion, 400 invalid role, 403 member listing, 403 wrong tenant, 404 cross-tenant member.
- **Clicked through the UI** as alice and bob: role change and reload, my own select disabled, Bob blocked in Acme but able to manage Initech, and the error state with the API stopped.
- **Trimmed the note** to keep it focused on what reviewers need.

## Incomplete requirements and limitations

All five functional requirement groups in the brief are implemented and tested. Known limitations:

- **The empty state is hard to reach with real data.** Only admins can view the list, and an admin is always a member. The UI handles an empty array, but you can't trigger it from the seeded data.
- **No portal-side automated tests.** The portal has no test framework set up, and the brief asked to use the existing one, so the UI was verified manually and with a headless browser rather than with committed tests. Server behaviour, which is where the security lives, is covered.
- **The API tests use a Prisma mock**, following the repo convention. The row lock and the real SQL are verified manually against PostgreSQL, not in CI.
- **Hosting (Railway/Vercel) from TASKS.md is not done.** The PDF brief doesn't ask for it, and it needs my own accounts.

## What I'd improve before production

In priority order:

1. **Integration tests against a real PostgreSQL** (Testcontainers or a CI service container) for `TenantGuard` and `updateRole`, including the concurrent-demotion case. _Why:_ the row lock and the real queries are the most security-critical parts, and today a mock stands in for them.
2. **Audit log for role changes** (who, whom, old and new role, when, tenant). _Why:_ role changes are privilege changes. Admins and support need to be able to answer "who made Bob an admin?".
3. **Enforce account status.** Reject `SUSPENDED` users at login and in the guards, and add a way to manage status. _Why:_ the column is currently informational only.
4. **Shorter-lived access tokens with refresh and revocation.** _Why:_ roles are checked live now, but a stolen 1-day token is still valid for a day.
5. **Rate limiting and security headers** on the auth and member endpoints. _Why:_ basic abuse protection.
6. **Pagination and search on the member list**, with a total count. _Why:_ real tenants can have thousands of members. The query is indexed by tenant, but returning everything doesn't scale.
7. **Confirmation for promoting to admin, plus portal tests** (React Testing Library or Playwright for the select's success and error flows). _Why:_ promoting someone to admin is a sensitive one-click action, and the UI states should be covered by regression tests.
8. **Structured logging and metrics** on 403/409 rates. _Why:_ repeated 403s on cross-tenant ids are a signal worth alerting on.
9. **An explicit tenant-aware data-access layer**, if more tenant-scoped modules get added. _Why:_ so new endpoints can't forget the `tenantId` filter. It's not worth the abstraction for one module.

## Demo video outline (3–5 minutes)

1. **Intro (0:00–0:20):** what the feature is and what the video will show.
2. **Admin flow (0:20–1:30):** sign in as `alice`, go to Acme, then Manage members. Show the table and statuses. Promote Bob ("Role updated"), reload, demote him back. Point out Alice's own select is disabled.
3. **Blocked paths (1:30–2:30):** sign in as `bob`, open Acme members, and show the 403 message. Switch to Initech, where Bob is admin. In a terminal, run the README curl block: self-demotion 409, invalid role 400, other tenant 403, other tenant's user 404. Stop the API and reload to show the error state.
4. **Code (2:30–3:30):** `TenantGuard`, then `MembersService.updateRole` (self check, transaction and lock, 404 scoping, last-admin check), then the DTO with `@IsEnum`.
5. **Tests (3:30–4:10):** run `pnpm --filter api test` live and name a few of the tenant-isolation tests.
6. **AI and production (4:10–4:50):** how I used AI and what I changed, the repo guidance I disagreed with, and the top three production improvements.
