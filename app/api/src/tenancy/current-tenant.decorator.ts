import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { TenantContext, TenantRequest } from './tenant.guard.js';

/**
 * The active tenant and the signed-in user's role in it, as validated by
 * TenantGuard. Only use on routes guarded by AuthGuard and TenantGuard.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): TenantContext => {
    const { tenant } = context.switchToHttp().getRequest<TenantRequest>();
    if (!tenant) {
      throw new Error('CurrentTenant used on a route without TenantGuard');
    }
    return tenant;
  },
);
