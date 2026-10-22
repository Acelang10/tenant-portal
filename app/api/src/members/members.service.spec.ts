import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { createPrismaMock } from '../../test/prisma-mock.js';
import {
  ACME,
  ALICE,
  BOB,
  DAVE,
  useTenantUsers,
} from '../../test/tenant-users-fixture.js';
import { MembersService } from './members.service.js';

describe('MembersService', () => {
  let prisma: ReturnType<typeof createPrismaMock>;
  let db: ReturnType<typeof useTenantUsers>;
  let service: MembersService;

  const acmeAdmin = { id: ACME, role: 'ADMIN' as const };
  const acmeMember = { id: ACME, role: 'MEMBER' as const };

  beforeEach(() => {
    prisma = createPrismaMock();
    db = useTenantUsers(prisma);
    service = new MembersService(prisma);
  });

  describe('list', () => {
    it("returns only the active tenant's members with name, email, role and status", async () => {
      const members = await service.list(acmeAdmin);

      expect(db.tenantUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tenantId: ACME } }),
      );
      expect(members).toEqual([
        {
          id: ALICE,
          name: 'Alice Anderson',
          email: 'alice@example.com',
          status: 'ACTIVE',
          role: 'ADMIN',
        },
        {
          id: BOB,
          name: 'Bob Brown',
          email: 'bob@example.com',
          status: 'ACTIVE',
          role: 'MEMBER',
        },
      ]);
    });

    it('rejects non-admins without querying members', async () => {
      await expect(service.list(acmeMember)).rejects.toThrow(
        ForbiddenException,
      );
      expect(db.tenantUser.findMany).not.toHaveBeenCalled();
    });
  });

  describe('updateRole', () => {
    it('promotes a member and persists the change', async () => {
      const member = await service.updateRole(acmeAdmin, BOB, 'ADMIN', ALICE);

      expect(member).toMatchObject({ id: BOB, role: 'ADMIN' });
      expect(db.tenantUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_userId: { tenantId: ACME, userId: BOB } },
          data: { role: 'ADMIN' },
        }),
      );
      expect(db.roleOf(ACME, BOB)).toBe('ADMIN');
    });

    it('locks the tenant row inside a transaction before changing roles', async () => {
      await service.updateRole(acmeAdmin, BOB, 'ADMIN', ALICE);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      const [sql, tenantId] = prisma.$queryRaw.mock.calls[0];
      expect(sql.join('?')).toContain('FOR UPDATE');
      expect(tenantId).toBe(ACME);
    });

    it('lets an admin demote another admin when one admin remains', async () => {
      await service.updateRole(acmeAdmin, BOB, 'ADMIN', ALICE);
      const member = await service.updateRole(acmeAdmin, BOB, 'MEMBER', ALICE);

      expect(member.role).toBe('MEMBER');
      expect(db.roleOf(ACME, ALICE)).toBe('ADMIN');
    });

    it('does not write when the role is unchanged', async () => {
      const member = await service.updateRole(acmeAdmin, BOB, 'MEMBER', ALICE);

      expect(member.role).toBe('MEMBER');
      expect(db.tenantUser.update).not.toHaveBeenCalled();
    });

    it('rejects non-admins', async () => {
      await expect(
        service.updateRole(acmeMember, ALICE, 'MEMBER', BOB),
      ).rejects.toThrow(ForbiddenException);
      expect(db.tenantUser.update).not.toHaveBeenCalled();
    });

    it('rejects an admin removing their own admin access', async () => {
      await expect(
        service.updateRole(acmeAdmin, ALICE, 'MEMBER', ALICE),
      ).rejects.toThrow(ConflictException);
      expect(db.tenantUser.update).not.toHaveBeenCalled();
      expect(db.roleOf(ACME, ALICE)).toBe('ADMIN');
    });

    it('never demotes the last admin (defence in depth behind the lock)', async () => {
      db.rows.find((m) => m.userId === BOB)!.role = 'ADMIN';
      db.tenantUser.count.mockResolvedValueOnce(1);

      await expect(
        service.updateRole(acmeAdmin, BOB, 'MEMBER', ALICE),
      ).rejects.toThrow(ConflictException);
      expect(db.tenantUser.update).not.toHaveBeenCalled();
      expect(db.roleOf(ACME, BOB)).toBe('ADMIN');
    });

    it('rechecks the actor inside the transaction (demoted since the request started)', async () => {
      db.rows.find((m) => m.userId === ALICE)!.role = 'MEMBER';

      await expect(
        service.updateRole(acmeAdmin, BOB, 'ADMIN', ALICE),
      ).rejects.toThrow(ForbiddenException);
      expect(db.tenantUser.update).not.toHaveBeenCalled();
    });

    it('returns 404 for a member of another tenant and leaves them unchanged', async () => {
      await expect(
        service.updateRole(acmeAdmin, DAVE, 'ADMIN', ALICE),
      ).rejects.toThrow(NotFoundException);
      expect(db.tenantUser.update).not.toHaveBeenCalled();
      expect(db.roleOf(ACME, DAVE)).toBeUndefined();
    });
  });
});
