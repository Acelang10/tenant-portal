import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AccountStatus, TenantRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { isTenantAdmin } from '../tenancy/tenant-access.js';
import type { TenantContext } from '../tenancy/tenant.guard.js';

const memberSelect = {
  role: true,
  user: { select: { id: true, name: true, email: true, status: true } },
} as const;

type MemberRow = {
  role: TenantRole;
  user: { id: string; name: string; email: string; status: AccountStatus };
};

function toMember({ role, user }: MemberRow) {
  return { ...user, role };
}

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(tenant: TenantContext) {
    this.assertAdmin(tenant);
    const rows = await this.prisma.tenantUser.findMany({
      where: { tenantId: tenant.id },
      select: memberSelect,
      orderBy: { user: { name: 'asc' } },
    });
    return rows.map(toMember);
  }

  async updateRole(
    tenant: TenantContext,
    userId: string,
    role: TenantRole,
    actorId: string,
  ) {
    this.assertAdmin(tenant);
    if (userId === actorId && role !== 'ADMIN') {
      throw new ConflictException('You cannot remove your own admin access');
    }

    return this.prisma.$transaction(async (tx) => {
      // Serialize role changes per tenant so two admins can't demote each
      // other at the same time and leave the tenant without an admin
      await tx.$queryRaw`SELECT id FROM tenants WHERE id = ${tenant.id} FOR UPDATE`;

      // Re-check inside the lock: the actor may have been demoted meanwhile
      const actor = await tx.tenantUser.findUnique({
        where: { tenantId_userId: { tenantId: tenant.id, userId: actorId } },
        select: { role: true },
      });
      if (actor?.role !== 'ADMIN') {
        throw new ForbiddenException('Only tenant admins can change roles');
      }

      // Scoped to the active tenant, so members of other tenants are a 404
      const where = { tenantId_userId: { tenantId: tenant.id, userId } };
      const member = await tx.tenantUser.findUnique({
        where,
        select: memberSelect,
      });
      if (!member) {
        throw new NotFoundException('Member not found');
      }
      if (member.role === role) {
        return toMember(member);
      }

      if (member.role === 'ADMIN') {
        const admins = await tx.tenantUser.count({
          where: { tenantId: tenant.id, role: 'ADMIN' },
        });
        if (admins <= 1) {
          throw new ConflictException('A tenant must keep at least one admin');
        }
      }

      const updated = await tx.tenantUser.update({
        where,
        data: { role },
        select: memberSelect,
      });
      return toMember(updated);
    });
  }

  private assertAdmin(tenant: TenantContext) {
    if (!isTenantAdmin(tenant)) {
      throw new ForbiddenException('Only tenant admins can manage members');
    }
  }
}
