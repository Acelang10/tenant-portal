import type { Mock } from 'vitest';
import type { PrismaService } from '../src/prisma/prisma.service.js';

const modelMethods = [
  'findUnique',
  'findFirst',
  'findMany',
  'create',
  'update',
  'upsert',
  'delete',
  'count',
] as const;

export type MockModel = Record<(typeof modelMethods)[number], Mock>;

function mockModel(): MockModel {
  return Object.fromEntries(
    modelMethods.map((method) => [method, vi.fn()]),
  ) as MockModel;
}

/**
 * In-memory stand-in for PrismaService. Tests use this instead of a database
 * (see AGENTS.md). Stub results per test, e.g.
 * `prisma.tenantUser.findMany.mockResolvedValue([...])`.
 */
type PrismaMock = {
  user: MockModel;
  tenant: MockModel;
  tenantUser: MockModel;
  $transaction: Mock;
  $queryRaw: Mock;
};

export function createPrismaMock(): PrismaService & PrismaMock {
  const prisma: PrismaMock = {
    user: mockModel(),
    tenant: mockModel(),
    tenantUser: mockModel(),
    $transaction: vi.fn((arg: unknown) =>
      typeof arg === 'function' ? arg(prisma) : Promise.all(arg as unknown[]),
    ),
    $queryRaw: vi.fn().mockResolvedValue([]),
  };
  return prisma as unknown as PrismaService & PrismaMock;
}
