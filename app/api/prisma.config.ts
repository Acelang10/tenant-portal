import { resolve } from 'node:path';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Shared .env lives at the repo root (scripts run from app/api)
config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Read lazily so `prisma generate` works without a database (e.g. Vercel installs)
    url: process.env.DATABASE_URL,
  },
});
