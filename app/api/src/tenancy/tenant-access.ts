import type { JwtPayload } from '../auth/auth.guard.js';

/**
 * Whether the signed-in user is an admin of the tenant.
 * Use this for all tenant admin checks: memberships are already in the access
 * token, so it doesn't need a database query.
 */
export function isTenantAdmin(user: JwtPayload, tenantId: string): boolean {
  return user.tenants.some(
    (tenant) => tenant.id === tenantId && tenant.role === 'ADMIN',
  );
}
