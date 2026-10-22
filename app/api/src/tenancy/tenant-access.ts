import type { TenantContext } from './tenant.guard.js';

/**
 * Whether the signed-in user is an admin of the active tenant. The role comes
 * from the database (TenantGuard), not from the access token, so a demoted
 * admin loses access immediately instead of when their token expires.
 */
export function isTenantAdmin(tenant: TenantContext): boolean {
  return tenant.role === 'ADMIN';
}
