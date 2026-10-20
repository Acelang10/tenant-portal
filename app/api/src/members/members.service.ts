import { Injectable, NotImplementedException } from '@nestjs/common';
import type { JwtPayload } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  // TODO: return the tenant's members with name, email, role and account status
  list(tenantId: string) {
    throw new NotImplementedException(`Members of ${tenantId}`);
  }

  // TODO: change a member's role. Only tenant admins may do this (see isTenantAdmin)
  updateRole(
    tenantId: string,
    userId: string,
    role: string,
    actor: JwtPayload,
  ) {
    throw new NotImplementedException(
      `Set ${userId} to ${role} in ${tenantId} by ${actor.sub}`,
    );
  }
}
