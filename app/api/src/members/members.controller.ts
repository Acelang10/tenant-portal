import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { TenantGuard, type TenantContext } from '../tenancy/tenant.guard.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { MembersService } from './members.service.js';

@Controller('members')
@UseGuards(AuthGuard, TenantGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@CurrentTenant() tenant: TenantContext) {
    return this.members.list(tenant);
  }

  @Patch(':userId')
  updateRole(
    @CurrentTenant() tenant: TenantContext,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: UpdateMemberRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.members.updateRole(tenant, userId, body.role, request.user.sub);
  }
}
