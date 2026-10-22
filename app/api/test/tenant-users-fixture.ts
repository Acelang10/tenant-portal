import type { createPrismaMock, MockModel } from './prisma-mock.js';

type Role = 'ADMIN' | 'MEMBER';
type Membership = { tenantId: string; userId: string; role: Role };

export const ACME = '00000000-0000-4000-8000-00000000000a';
export const GLOBEX = '00000000-0000-4000-8000-00000000000b';

export const ALICE = '10000000-0000-4000-8000-000000000001';
export const BOB = '10000000-0000-4000-8000-000000000002';
export const CAROL = '10000000-0000-4000-8000-000000000003';
export const DAVE = '10000000-0000-4000-8000-000000000004';

const users: Record<string, { name: string; email: string }> = {
  [ALICE]: { name: 'Alice Anderson', email: 'alice@example.com' },
  [BOB]: { name: 'Bob Brown', email: 'bob@example.com' },
  [CAROL]: { name: 'Carol Clark', email: 'carol@example.com' },
  [DAVE]: { name: 'Dave Davis', email: 'dave@example.com' },
};

/**
 * Backs the tenantUser mock with an in-memory table, so tests exercise the real
 * queries' `where` clauses instead of returning canned rows.
 * Acme: Alice (admin), Bob (member). Globex: Carol (admin), Dave (member).
 */
export function useTenantUsers(prisma: ReturnType<typeof createPrismaMock>) {
  const rows: Membership[] = [
    { tenantId: ACME, userId: ALICE, role: 'ADMIN' },
    { tenantId: ACME, userId: BOB, role: 'MEMBER' },
    { tenantId: GLOBEX, userId: CAROL, role: 'ADMIN' },
    { tenantId: GLOBEX, userId: DAVE, role: 'MEMBER' },
  ];

  const toRow = (m: Membership) => ({
    role: m.role,
    user: { id: m.userId, ...users[m.userId], status: 'ACTIVE' },
  });
  const find = (key: { tenantId: string; userId: string }) =>
    rows.find((m) => m.tenantId === key.tenantId && m.userId === key.userId);

  prisma.tenantUser.findUnique.mockImplementation(({ where }) => {
    const m = find(where.tenantId_userId);
    return Promise.resolve(m ? toRow(m) : null);
  });
  prisma.tenantUser.findMany.mockImplementation(({ where }) =>
    Promise.resolve(
      rows.filter((m) => m.tenantId === where.tenantId).map(toRow),
    ),
  );
  prisma.tenantUser.count.mockImplementation(({ where }) =>
    Promise.resolve(
      rows.filter((m) => m.tenantId === where.tenantId && m.role === where.role)
        .length,
    ),
  );
  prisma.tenantUser.update.mockImplementation(({ where, data }) => {
    const m = find(where.tenantId_userId);
    if (!m) {
      return Promise.reject(new Error('Record to update not found'));
    }
    m.role = data.role;
    return Promise.resolve(toRow(m));
  });

  return {
    rows,
    // Same mocks as prisma.tenantUser, typed as plain functions for assertions
    tenantUser: prisma.tenantUser as MockModel,
    roleOf: (tenantId: string, userId: string) =>
      find({ tenantId, userId })?.role,
  };
}
