/**
 * Circle + CircleMembership tipleri + query.
 */
import { builder } from '../builder';
import { CircleTypeRef } from './enums';

builder.prismaObject('Circle', {
  fields: (t) => ({
    id: t.exposeID('id'),
    name: t.exposeString('name'),
    target: t.field({ type: 'NonNegativeFloat', resolve: (c) => Number(c.target) }),
    type: t.expose('type', { type: CircleTypeRef }),
    isPublic: t.exposeBoolean('isPublic'),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
    members: t.relation('members'),
  }),
});

builder.prismaObject('CircleMembership', {
  fields: (t) => ({
    id: t.exposeID('id'),
    contribution: t.field({
      type: 'NonNegativeFloat',
      resolve: (m) => Number(m.contribution),
    }),
    role: t.exposeString('role'),
    joinedAt: t.expose('joinedAt', { type: 'DateTime' }),
    user: t.relation('user'),
    circle: t.relation('circle'),
  }),
});

builder.queryField('circles', (t) =>
  t.prismaField({
    type: ['Circle'],
    authScopes: { authenticated: true },
    description: 'Kullanıcının üye olduğu çemberler',
    resolve: async (query, _root, _args, ctx) => {
      return ctx.prisma.circle.findMany({
        ...query,
        where: {
          members: { some: { userId: ctx.userId! } },
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  }),
);
