import { IsEnum } from 'class-validator';
import { TenantRole } from '../../generated/prisma/client.js';

export class UpdateMemberRoleDto {
  // Validated on the server: the portal's <select> is not a security boundary
  @IsEnum(TenantRole)
  role: TenantRole;
}
