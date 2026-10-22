# Tenant Portal

A multi-tenant portal. Users sign in with a username and password and switch between the tenants they belong to. A user can be an **Admin** or a **Member** of each tenant.

| App | Stack | Path | Local URL |
|---|---|---|---|
| API | NestJS 12, Prisma 7, PostgreSQL | `app/api` | http://localhost:3000 |
| Portal | Next.js 16 (App Router), Tailwind CSS 4 | `app/portal` | http://localhost:3001 |

Both apps live in one pnpm workspace and share a single `.env` at the repo root.

> **Doing the assessment?** Start with [TASKS.md](TASKS.md). It explains how to fork this repo, what to build and how to submit.
>
> **Reviewing the member management submission?** See [SUBMISSION.md](SUBMISSION.md) for what was built, the design decisions and test results, and [Testing it yourself](#testing-it-yourself) below to try it.

## Prerequisites

- Node.js 20.19 or newer
- pnpm 11 (`corepack enable` picks up the version in `package.json`)
- Docker, for the local PostgreSQL database

## Run it locally

```bash
# 1. Install dependencies (this also generates the Prisma client)
pnpm install

# 2. Create your env file
cp .env.example .env

# 3. Start PostgreSQL on localhost:5433
pnpm db:up

# 4. Create the tables and load the sample users
pnpm db:migrate
pnpm db:seed

# 5. Start both apps, each in its own terminal
pnpm api:dev
pnpm portal:dev
```

Open http://localhost:3001 and sign in with one of the test accounts below.

## Testing it yourself

Ports: **API on http://localhost:3000**, **portal on http://localhost:3001**, PostgreSQL on **localhost:5433**.

### Setup (once)

```bash
pnpm install
cp .env.example .env
pnpm db:up        # PostgreSQL 17 in Docker (docker compose), port 5433
pnpm db:migrate   # applies both migrations, including the account status column
pnpm db:seed      # 7 tenants, 10 users, password 123456 for everyone
```

No Docker? Any local PostgreSQL works: create a `tenant_portal` user and database (the user needs `CREATEDB` for `prisma migrate dev`) and point `DATABASE_URL` in `.env` at it.

### Run

```bash
pnpm api:dev      # terminal 1, http://localhost:3000
pnpm portal:dev   # terminal 2, http://localhost:3001
```

### Automated checks

```bash
pnpm --filter api test        # unit + HTTP tests (no database needed)
pnpm --filter api test:e2e    # boots the full app; needs the .env and database
pnpm --filter api lint
pnpm --filter portal lint
pnpm api:build && pnpm portal:build   # type-checks both apps
```

### Who to sign in as

| Tenant | Admin | Member |
|---|---|---|
| Acme Corporation (`acme`) | `alice` | `bob` |
| Globex Industries (`globex`) | `alice` | `carol` |
| Initech (`initech`) | `bob` | `carol` |

To switch user in the portal, click **Sign out** on the dashboard and sign in as someone else (or use a private window per user). The members page is at `/dashboard/members?tenant=<slug>`, and admins get a **Manage members** button on the dashboard.

To act as different users with curl, paste this into a shell (needs `node` on the PATH, which you already have):

```bash
API=http://localhost:3000
login() {
  curl -s -X POST $API/auth/login -H 'content-type: application/json' \
    -d "{\"username\":\"$1\",\"password\":\"123456\"}" | node -pe 'JSON.parse(require("fs").readFileSync(0)).accessToken'
}
tenant_id() { # tenant_id <token> <slug>
  curl -s $API/auth/me -H "Authorization: Bearer $1" | node -pe "JSON.parse(require('fs').readFileSync(0)).tenants.find(t => t.slug === '$2').id"
}
user_id() { curl -s $API/auth/me -H "Authorization: Bearer $1" | node -pe 'JSON.parse(require("fs").readFileSync(0)).id'; }

ALICE=$(login alice); BOB=$(login bob); CAROL=$(login carol)
ACME=$(tenant_id $ALICE acme); INITECH=$(tenant_id $BOB initech)
ALICE_ID=$(user_id $ALICE); BOB_ID=$(user_id $BOB); CAROL_ID=$(user_id $CAROL)

# act_as <token> <tenant id> [curl args...]
act_as() { t=$1; tenant=$2; shift 2; curl -s -H "Authorization: Bearer $t" -H "x-tenant-id: $tenant" -H 'content-type: application/json' "$@"; echo; }
```

Then:

```bash
act_as $ALICE $ACME $API/members                                                # 200, Alice + Bob
act_as $ALICE $ACME -X PATCH $API/members/$BOB_ID -d '{"role":"ADMIN"}'         # 200, Bob is now Admin
act_as $ALICE $ACME -X PATCH $API/members/$BOB_ID -d '{"role":"MEMBER"}'        # 200, back to Member
act_as $ALICE $ACME -X PATCH $API/members/$ALICE_ID -d '{"role":"MEMBER"}'      # 409, can't remove own admin access
act_as $ALICE $ACME -X PATCH $API/members/$BOB_ID -d '{"role":"OWNER"}'         # 400, invalid role
act_as $BOB   $ACME $API/members                                                # 403, Bob is only a member of Acme
act_as $ALICE $INITECH $API/members                                             # 403, Alice isn't in Initech
act_as $ALICE $ACME -X PATCH $API/members/$CAROL_ID -d '{"role":"ADMIN"}'       # 404, Carol isn't in Acme
```

`pnpm db:seed` resets every membership to the table above, so run it whenever you want a clean slate.

### Manual checklist

- [ ] **View members:** sign in as `alice`, open Acme, click **Manage members**. You see Alice and Bob with name, email, status and role. A skeleton shows while it loads.
- [ ] **Change a role:** as `alice`, set Bob to Admin. "Role updated" appears and it survives a reload. Set him back to Member.
- [ ] **Self-demotion blocked:** Alice's own role select is disabled ("That's you"). The API also refuses it: the `ALICE_ID` curl above returns 409.
- [ ] **Member can't edit:** sign in as `bob` and open `/dashboard/members?tenant=acme`. You get "You can't manage members of this tenant" and no Manage members button on the Acme dashboard. In Initech, where Bob is admin, he can manage Carol.
- [ ] **Cross-tenant blocked:** as `alice`, the curl calls with `$INITECH` (403) and `$CAROL_ID` in Acme (404) fail and nothing changes.
- [ ] **Error state:** stop the API and reload the members page. You get "Couldn't load members" with a Try again button.
- [ ] **Access revoked while the page is open:** as `bob`, open Initech's members page. In a terminal, demote Bob directly in the database:
  `docker compose exec db psql -U tenant_portal -c "update tenant_users set role='MEMBER' where user_id=(select id from users where username='bob') and tenant_id=(select id from tenants where slug='initech')"`.
  Back in the browser, change Carol's role: it shows "Only tenant admins can manage members" and the select reverts. Run `pnpm db:seed` to restore.

## Test accounts

Every seeded user has the password **`123456`**. Sign in with the username, not the email.

| Username | Tenants (role) |
|---|---|
| `alice` | Acme Corporation (Admin), Globex Industries (Admin) |
| `bob` | Initech (Admin), Acme Corporation (Member) |
| `carol` | Globex Industries (Member), Initech (Member) |
| `dave` | Umbrella Holdings (Admin) |
| `erin` | Stark Enterprises (Admin) |
| `frank` | Wayne Logistics (Admin) |
| `grace` | Hooli (Admin) |
| `heidi` | Umbrella Holdings (Member) |
| `ivan` | Stark Enterprises (Member) |
| `judy` | Hooli (Member) |

Use `alice`, `bob` or `carol` to try the tenant switcher. The dashboard's Admin panel only shows in tenants where you're an Admin. The dashboard numbers are static sample data.

Running `pnpm db:seed` again is safe. It updates the existing records instead of creating duplicates.

## Scripts

Run these from the repo root.

| Script | What it does |
|---|---|
| `pnpm api:dev` | Start the API in watch mode |
| `pnpm api:build` / `pnpm api:start` | Build the API / run the build |
| `pnpm portal:dev` | Start the portal in dev mode |
| `pnpm portal:build` / `pnpm portal:start` | Build the portal / run the build |
| `pnpm db:up` / `pnpm db:down` | Start / stop the PostgreSQL container |
| `pnpm db:migrate` | Create and apply migrations after a schema change (development) |
| `pnpm db:deploy` | Apply existing migrations without creating new ones (production) |
| `pnpm db:seed` | Load the test tenants and users |
| `pnpm db:reset` | Drop all data, re-apply migrations and re-seed |

After changing `app/api/prisma/schema.prisma`, run `pnpm db:migrate --name <change>` and then `pnpm --filter api db:generate`.

## Environment variables

All variables live in the root `.env`. `.env.example` lists every one of them.

| Variable | Used by | Purpose |
|---|---|---|
| `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT` | `docker-compose.yml` | Local PostgreSQL container |
| `DATABASE_URL` | API, Prisma | PostgreSQL connection string |
| `API_PORT` | API | Port the API listens on (falls back to `PORT`, then 3000) |
| `PORTAL_URL` | API | Origin allowed by CORS |
| `JWT_SECRET` | API | Secret that signs access tokens |
| `JWT_EXPIRES_IN` | API | Token lifetime, e.g. `1d` |
| `PORTAL_PORT` | Portal | Port the portal listens on |
| `NEXT_PUBLIC_API_URL` | Portal | Base URL of the API |

## How it works

- **Login:** the portal posts the username and password to `POST /auth/login`. The API checks the bcrypt hash and returns a JWT. The portal stores it in an httpOnly `session` cookie, so browser JavaScript can't read it.
- **Dashboard:** the portal's server calls `GET /auth/me` with that token to get the user and their tenants. The selected tenant is kept in the URL (`/dashboard?tenant=acme`).
- **Route protection:** `app/portal/src/proxy.ts` sends visitors without a session cookie to `/login`. The dashboard also redirects to `/login` when the API rejects the token, for example once it expires.
- **Members:** `/dashboard/members?tenant=<slug>` calls `GET /members` and `PATCH /members/:userId` with the selected tenant in `x-tenant-id`. The API's `TenantGuard` checks the user's membership and role in the database on every request; the header is never trusted on its own.

### Data model

```
User ──< TenantUser >── Tenant
          role: ADMIN | MEMBER
```

The schema is in `app/api/prisma/schema.prisma`, the migrations are in `app/api/prisma/migrations/` and the seeder is `app/api/prisma/seed.ts`.

## Project structure

```
.
├── .env.example            # every environment variable
├── docker-compose.yml      # local PostgreSQL
├── TASKS.md                # assessment tasks: start here
└── app/
    ├── api/
    │   ├── prisma/         # schema, migrations, seeder
    │   └── src/
    │       ├── auth/       # login, /auth/me, JWT guard
    │       └── prisma/     # PrismaService
    └── portal/
        └── src/
            ├── app/
            │   ├── login/      # login page and form
            │   └── dashboard/  # dashboard and tenant switcher
            ├── lib/            # API client, session cookie, sample data
            └── proxy.ts        # redirects signed-out visitors
```

## Troubleshooting

- **`EADDRINUSE` on port 3000 or 3001:** another process already uses the port. Find it with `lsof -nP -iTCP:3000 -sTCP:LISTEN`, then stop it or change `API_PORT` / `PORTAL_PORT` in `.env`.
- **Port 5433 already in use:** change `DB_PORT` in `.env`, and the port inside `DATABASE_URL` to match.
- **"Can't reach the API" on the login page:** make sure `pnpm api:dev` is running and `NEXT_PUBLIC_API_URL` points to it.
