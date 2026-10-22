import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.guard.js';
import type { TenantRole } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const TENANT_HEADER = 'x-tenant-id';

export type TenantContext = { id: string; role: TenantRole };

export type TenantRequest = AuthenticatedRequest & { tenant: TenantContext };

/**
 * Establishes the active tenant for the request. The `x-tenant-id` header only
 * says which tenant the client wants; the guard checks in the database that the
 * signed-in user belongs to it and loads their current role. Use after AuthGuard.
 */
@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = request.header(TENANT_HEADER);
    if (!tenantId) {
      throw new BadRequestException(`Missing ${TENANT_HEADER} header`);
    }

    const membership = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId: request.user.sub } },
      select: { role: true },
    });
    // Same response whether the tenant doesn't exist or the user isn't in it
    if (!membership) {
      throw new ForbiddenException('You do not have access to this tenant');
    }

    request.tenant = { id: tenantId, role: membership.role };
    return true;
  }
}
