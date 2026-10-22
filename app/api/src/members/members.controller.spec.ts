import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { createPrismaMock } from '../../test/prisma-mock.js';
import {
  ACME,
  ALICE,
  BOB,
  CAROL,
  DAVE,
  GLOBEX,
  useTenantUsers,
} from '../../test/tenant-users-fixture.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MembersController } from './members.controller.js';
import { MembersService } from './members.service.js';

// HTTP-level tests: real guards, validation pipe and service; in-memory Prisma
describe('MembersController (HTTP)', () => {
  let app: INestApplication<App>;
  let prisma: ReturnType<typeof createPrismaMock>;
  let db: ReturnType<typeof useTenantUsers>;
  let tokens: Record<string, string>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    db = useTenantUsers(prisma);

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      controllers: [MembersController],
      providers: [
        MembersService,
        AuthGuard,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    // Same pipe configuration as main.ts
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    const jwt = moduleRef.get(JwtService);
    tokens = {};
    for (const [name, sub] of Object.entries({ ALICE, BOB, CAROL, DAVE })) {
      tokens[name] = await jwt.signAsync({ sub, username: name });
    }
  });

  afterEach(async () => {
    await app.close();
  });

  const get = (token: string | undefined, tenantId?: string) => {
    const req = request(app.getHttpServer()).get('/members');
    if (token) req.set('Authorization', `Bearer ${token}`);
    if (tenantId) req.set('x-tenant-id', tenantId);
    return req;
  };

  const patch = (
    token: string,
    tenantId: string,
    userId: string,
    body: object,
  ) =>
    request(app.getHttpServer())
      .patch(`/members/${userId}`)
      .set('Authorization', `Bearer ${token}`)
      .set('x-tenant-id', tenantId)
      .send(body);

  describe('authentication', () => {
    it('401s without a token', async () => {
      await get(undefined, ACME).expect(401);
    });

    it('401s with a token signed by another secret', async () => {
      const forged = await new JwtService({ secret: 'wrong' }).signAsync({
        sub: ALICE,
        username: 'alice',
      });
      await get(forged, ACME).expect(401);
    });
  });

  describe('tenant isolation', () => {
    it('400s when no tenant is selected', async () => {
      const res = await get(tokens.ALICE).expect(400);
      expect(res.body.message).toBe('Missing x-tenant-id header');
    });

    it("403s when the user picks a tenant they don't belong to", async () => {
      // Alice is an admin in Acme, but asks for Globex
      const res = await get(tokens.ALICE, GLOBEX).expect(403);
      expect(res.body.message).toBe('You do not have access to this tenant');
      expect(db.tenantUser.findMany).not.toHaveBeenCalled();
    });

    it('403s the same way for a tenant id that does not exist', async () => {
      const res = await get(
        tokens.ALICE,
        '99999999-0000-4000-8000-000000000000',
      ).expect(403);
      expect(res.body.message).toBe('You do not have access to this tenant');
    });

    it("only lists the selected tenant's members", async () => {
      const res = await get(tokens.CAROL, GLOBEX).expect(200);
      expect(res.body.map((m: { id: string }) => m.id)).toEqual([CAROL, DAVE]);
    });

    it('404s when updating a user from another tenant, without leaking or changing them', async () => {
      const res = await patch(tokens.ALICE, ACME, DAVE, { role: 'ADMIN' });
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Member not found');
      expect(db.roleOf(GLOBEX, DAVE)).toBe('MEMBER');
    });

    it("can't use a tenant they belong to as a member to change another tenant", async () => {
      // Bob is only a member of Acme; Globex's Dave must stay untouched
      await patch(tokens.BOB, ACME, DAVE, { role: 'ADMIN' }).expect(403);
      await patch(tokens.BOB, GLOBEX, DAVE, { role: 'ADMIN' }).expect(403);
      expect(db.roleOf(GLOBEX, DAVE)).toBe('MEMBER');
    });
  });

  describe('authorization', () => {
    it('lets admins list members', async () => {
      const res = await get(tokens.ALICE, ACME).expect(200);
      expect(res.body).toEqual([
        expect.objectContaining({
          id: ALICE,
          name: 'Alice Anderson',
          email: 'alice@example.com',
          role: 'ADMIN',
          status: 'ACTIVE',
        }),
        expect.objectContaining({ id: BOB, role: 'MEMBER' }),
      ]);
    });

    it('403s members listing or changing roles', async () => {
      await get(tokens.BOB, ACME).expect(403);
      await patch(tokens.BOB, ACME, BOB, { role: 'ADMIN' }).expect(403);
      expect(db.roleOf(ACME, BOB)).toBe('MEMBER');
    });

    it('uses the current database role, so a demoted admin loses access immediately', async () => {
      await get(tokens.ALICE, ACME).expect(200);
      db.rows.find((m) => m.userId === ALICE)!.role = 'MEMBER';
      await get(tokens.ALICE, ACME).expect(403);
    });
  });

  describe('updating roles', () => {
    it('persists a valid change and returns the updated member', async () => {
      const res = await patch(tokens.ALICE, ACME, BOB, {
        role: 'ADMIN',
      }).expect(200);
      expect(res.body).toMatchObject({ id: BOB, role: 'ADMIN' });
      expect(db.roleOf(ACME, BOB)).toBe('ADMIN');
    });

    it.each([
      [{ role: 'OWNER' }],
      [{ role: 'admin' }],
      [{ role: '' }],
      [{ role: null }],
      [{}],
    ])('400s on an invalid role %j without writing', async (body) => {
      const res = await patch(tokens.ALICE, ACME, BOB, body).expect(400);
      expect(res.body.message).toEqual([
        'role must be one of the following values: ADMIN, MEMBER',
      ]);
      expect(db.tenantUser.update).not.toHaveBeenCalled();
    });

    it('400s on a malformed member id', async () => {
      await patch(tokens.ALICE, ACME, 'not-a-uuid', { role: 'ADMIN' }).expect(
        400,
      );
      expect(db.tenantUser.update).not.toHaveBeenCalled();
    });

    it('404s for an unknown member id', async () => {
      await patch(tokens.ALICE, ACME, '20000000-0000-4000-8000-000000000000', {
        role: 'ADMIN',
      }).expect(404);
    });

    it('409s when an admin tries to remove their own admin access', async () => {
      const res = await patch(tokens.ALICE, ACME, ALICE, {
        role: 'MEMBER',
      }).expect(409);
      expect(res.body.message).toBe('You cannot remove your own admin access');
      expect(db.roleOf(ACME, ALICE)).toBe('ADMIN');
    });

    it('ignores a tenant id smuggled into the body', async () => {
      await patch(tokens.ALICE, ACME, BOB, {
        role: 'ADMIN',
        tenantId: GLOBEX,
      }).expect(200);
      expect(db.roleOf(ACME, BOB)).toBe('ADMIN');
      expect(db.roleOf(GLOBEX, CAROL)).toBe('ADMIN');
      expect(db.roleOf(GLOBEX, DAVE)).toBe('MEMBER');
    });
  });
});
