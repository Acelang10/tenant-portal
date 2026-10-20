# Assessment Tasks

The requirements in this file are the source of truth. The repo may contain outdated or incorrect guidance, the way real codebases do. When something in the code or docs conflicts with a requirement, the requirement wins.

You may use AI tools. Along with your code, include a short section titled **"Where I disagreed with the repo or my AI"**, listing anything you chose not to follow and why.

## Done

- [x] **Monorepo setup:** NestJS API in `app/api`, Next.js portal in `app/portal`, one pnpm workspace
  - [x] `pnpm api:dev` and `pnpm portal:dev` run from the repo root
  - [x] One `.env` at the root is loaded by both apps
  - [x] `.env.example` lists every variable
- [x] **Database:** Prisma migration for `User`, `Tenant` and `TenantUser` (role `ADMIN` / `MEMBER`)
- [x] **Seeder:** 10 users, all with password `123456`
  - [x] 1 user is Admin of 2 tenants (`alice`)
  - [x] 1 user is Admin of 1 tenant and Member of another (`bob`)
  - [x] 1 user is Member of 2 tenants (`carol`)
  - [x] The other 7 users have 1 tenant each
  - [x] Safe to re-run, with no duplicates
- [x] **Login:** username and password form, session in an httpOnly cookie
- [x] **Dashboard:** tenant switcher, static sample data, Admin-only panel
- [x] **Docs:** `README.md` with local setup

## To do: tenant members page

A starting point is already in place: `app/api/src/members` (API) and `app/portal/src/lib/members.ts` (portal). Complete them and build the members page.

### 1. Display organization members

- [ ] Page that lists the current organization's members, showing for each:
  - [ ] Member name
  - [ ] Email address
  - [ ] Role (Admin or Member)
  - [ ] Account status
- [ ] Loading state
- [ ] Error state
- [ ] Empty state

### 2. Update a member's role

- [ ] An authorized administrator can change a member's role
- [ ] Only supported role values are accepted
- [ ] The UI reflects a successful update
- [ ] A failed update shows an appropriate error
- [ ] An administrator can't accidentally remove their own admin access

### 3. Enforce authorization and tenant isolation

- [ ] Users can only access members of a tenant they're authorized for
- [ ] The server establishes and validates the tenant context; it never trusts a client-supplied tenant ID
- [ ] Only authorized administrators can update member roles
- [ ] Invalid or unauthorized requests don't modify data

### 4. Validate and persist changes

- [ ] Validate request payloads on the server
- [ ] Persist successful role changes in PostgreSQL
- [ ] Return appropriate HTTP status codes and useful error responses
- [ ] Handle missing members
- [ ] Handle invalid role values

### 5. Testing

- [ ] Meaningful automated tests covering the functionality
- [ ] Tests for authorization
- [ ] Tests for tenant isolation

## To do: hosting

The API and its database go on **Railway**, and the portal goes on **Vercel**. Deploy the API first, because the portal needs its URL.

### 1. Railway: PostgreSQL and API

- [ ] Push the repo to GitHub.
- [ ] Create a Railway project and add a **PostgreSQL** database.
- [ ] Add a service from the GitHub repo for the API. Leave **Root Directory** empty: pnpm needs the workspace root and its lockfile.
- [ ] Set the service's commands:

  | Setting | Value |
  |---|---|
  | Build command | `pnpm install --frozen-lockfile && pnpm api:build` |
  | Pre-deploy command | `pnpm db:deploy` |
  | Start command | `pnpm api:start` |
  | Watch paths | `app/api/**` |

- [ ] Set the service's variables:

  | Variable | Value |
  |---|---|
  | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference to the Railway database) |
  | `JWT_SECRET` | A long random string, e.g. from `openssl rand -base64 32` |
  | `JWT_EXPIRES_IN` | `1d` |
  | `PORTAL_URL` | The Vercel URL from step 2. Update it once the portal is deployed. |

  Don't set `API_PORT` here. Railway injects `PORT` and the API falls back to it.
- [ ] Under **Networking**, generate a public domain for the API.
- [ ] Seed the hosted database from your machine. Use the database's **public** connection URL from Railway, because the internal one only works inside Railway:

  ```bash
  DATABASE_URL="<railway public database url>" pnpm db:seed
  ```

- [ ] Check it: `curl -X POST https://<api-domain>/auth/login -H 'content-type: application/json' -d '{"username":"alice","password":"123456"}'` returns an `accessToken`.

### 2. Vercel: portal

- [ ] Import the GitHub repo into Vercel.
- [ ] Set **Root Directory** to `app/portal`. Vercel detects Next.js and pnpm and installs from the workspace root.
- [ ] Add the environment variable `NEXT_PUBLIC_API_URL` = `https://<api-domain>` (no trailing slash). It's built into the app, so redeploy after changing it.
- [ ] Deploy, then set `PORTAL_URL` on Railway to the Vercel URL.
- [ ] Check it: open the Vercel URL, sign in as `alice` / `123456`, switch between Acme and Globex, then sign out.

### 3. Submission

- [ ] Add the live URLs here and to the README:
  - Portal: `https://…vercel.app`
  - API: `https://…up.railway.app`
- [ ] Make sure no real secrets are committed. `.env` is git-ignored; only `.env.example` is tracked.
