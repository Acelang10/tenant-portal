import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from './auth.guard.js';
import type { LoginDto } from './login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login({ username, password }: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      include: { tenants: { select: { tenantId: true, role: true } } },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      tenants: user.tenants.map(({ tenantId, role }) => ({
        id: tenantId,
        role,
      })),
    };
    return { accessToken: await this.jwt.signAsync(payload) };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
        tenants: {
          select: {
            role: true,
            tenant: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { tenant: { name: 'asc' } },
        },
      },
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const { tenants, ...profile } = user;
    return {
      ...profile,
      tenants: tenants.map(({ role, tenant }) => ({ ...tenant, role })),
    };
  }
}
