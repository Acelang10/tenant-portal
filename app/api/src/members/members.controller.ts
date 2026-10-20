import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard, type AuthenticatedRequest } from '../auth/auth.guard.js';
import { CurrentTenant } from '../tenancy/current-tenant.decorator.js';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto.js';
import { MembersService } from './members.service.js';

@Controller('members')
@UseGuards(AuthGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.members.list(tenantId);
  }

  @Patch(':userId')
  updateRole(
    @CurrentTenant() tenantId: string,
    @Param('userId') userId: string,
    @Body() body: UpdateMemberRoleDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.members.updateRole(tenantId, userId, body.role, request.user);
  }
}
