import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import { config } from 'dotenv';
import { PrismaClient, TenantRole } from '../src/generated/prisma/client.js';

config({ path: resolve(process.cwd(), '../../.env'), quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Every seeded user signs in with this password
const PASSWORD = '123456';

const tenants = [
  { slug: 'acme', name: 'Acme Corporation' },
  { slug: 'globex', name: 'Globex Industries' },
  { slug: 'initech', name: 'Initech' },
  { slug: 'umbrella', name: 'Umbrella Holdings' },
  { slug: 'stark', name: 'Stark Enterprises' },
  { slug: 'wayne', name: 'Wayne Logistics' },
  { slug: 'hooli', name: 'Hooli' },
];

const { ADMIN, MEMBER } = TenantRole;

const users: {
  username: string;
  name: string;
  memberships: { tenant: string; role: TenantRole }[];
}[] = [
  // Admin of two tenants
  {
    username: 'alice',
    name: 'Alice Anderson',
    memberships: [
      { tenant: 'acme', role: ADMIN },
      { tenant: 'globex', role: ADMIN },
    ],
  },
  // Admin of one tenant, member of another
  {
    username: 'bob',
    name: 'Bob Brown',
    memberships: [
      { tenant: 'initech', role: ADMIN },
      { tenant: 'acme', role: MEMBER },
    ],
  },
  // Member of two tenants
  {
    username: 'carol',
    name: 'Carol Clark',
    memberships: [
      { tenant: 'globex', role: MEMBER },
      { tenant: 'initech', role: MEMBER },
    ],
  },
  // Single-tenant users
  {
    username: 'dave',
    name: 'Dave Davis',
    memberships: [{ tenant: 'umbrella', role: ADMIN }],
  },
  {
    username: 'erin',
    name: 'Erin Evans',
    memberships: [{ tenant: 'stark', role: ADMIN }],
  },
  {
    username: 'frank',
    name: 'Frank Foster',
    memberships: [{ tenant: 'wayne', role: ADMIN }],
  },
  {
    username: 'grace',
    name: 'Grace Green',
    memberships: [{ tenant: 'hooli', role: ADMIN }],
  },
  {
    username: 'heidi',
    name: 'Heidi Hughes',
    memberships: [{ tenant: 'umbrella', role: MEMBER }],
  },
  {
    username: 'ivan',
    name: 'Ivan Iverson',
    memberships: [{ tenant: 'stark', role: MEMBER }],
  },
  {
    username: 'judy',
    name: 'Judy Johnson',
    memberships: [{ tenant: 'hooli', role: MEMBER }],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const [tenantsBefore, usersBefore] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
  ]);

  const tenantIds = new Map<string, string>();
  for (const tenant of tenants) {
    const { id } = await prisma.tenant.upsert({
      where: { slug: tenant.slug },
      update: { name: tenant.name },
      create: tenant,
    });
    tenantIds.set(tenant.slug, id);
  }

  for (const { username, name, memberships } of users) {
    const user = await prisma.user.upsert({
      where: { username },
      update: { name, passwordHash },
      create: {
        username,
        name,
        email: `${username}@example.com`,
        passwordHash,
      },
    });

    // Reset memberships so re-running the seeder matches the list above
    await prisma.tenantUser.deleteMany({ where: { userId: user.id } });
    await prisma.tenantUser.createMany({
      data: memberships.map(({ tenant, role }) => ({
        userId: user.id,
        tenantId: tenantIds.get(tenant)!,
        role,
      })),
    });
  }

  // Records are upserted by slug/username, so re-running never duplicates them
  const [tenantsAfter, usersAfter, memberships] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.tenantUser.count(),
  ]);
  console.log(
    `Tenants: ${tenantsAfter} total (${tenantsAfter - tenantsBefore} new)\n` +
      `Users: ${usersAfter} total (${usersAfter - usersBefore} new)\n` +
      `Memberships: ${memberships} total\n` +
      `Password for every seeded user: ${PASSWORD}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
