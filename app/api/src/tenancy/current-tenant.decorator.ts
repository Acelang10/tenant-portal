import {
  BadRequestException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';

export const TENANT_HEADER = 'x-tenant-id';

/**
 * The active tenant's id, taken from the `x-tenant-id` header.
 * The API gateway validates this header against the session before requests
 * reach the API (see AGENTS.md), so it can be used as-is.
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = request.header(TENANT_HEADER);
    if (!tenantId) {
      throw new BadRequestException(`Missing ${TENANT_HEADER} header`);
    }
    return tenantId;
  },
);
