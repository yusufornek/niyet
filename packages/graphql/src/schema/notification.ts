/**
 * Notification tipi + query + markNotificationRead mutation.
 */
import { builder } from '../builder';
import { NotificationTypeRef } from './enums';

builder.prismaObject('Notification', {
  fields: (t) => ({
    id: t.exposeID('id'),
    type: t.expose('type', { type: NotificationTypeRef }),
    title: t.exposeString('title'),
    body: t.exposeString('body'),
    read: t.exposeBoolean('read'),
    payload: t.expose('payload', { type: 'JSON', nullable: true }),
    createdAt: t.expose('createdAt', { type: 'DateTime' }),
  }),
});

builder.queryField('notifications', (t) =>
  t.prismaField({
    type: ['Notification'],
    authScopes: { authenticated: true },
    args: { unreadOnly: t.arg.boolean({ defaultValue: false }) },
    resolve: async (query, _root, args, ctx) => {
      return ctx.prisma.notification.findMany({
        ...query,
        where: {
          userId: ctx.userId!,
          ...(args.unreadOnly ? { read: false } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    },
  }),
);

builder.mutationField('markNotificationRead', (t) =>
  t.prismaField({
    type: 'Notification',
    authScopes: { authenticated: true },
    args: { id: t.arg.id({ required: true }) },
    resolve: async (query, _root, args, ctx) => {
      const n = await ctx.prisma.notification.findFirst({
        where: { id: String(args.id), userId: ctx.userId! },
        select: { id: true },
      });
      if (!n) throw new Error('Notification bulunamadı.');
      return ctx.prisma.notification.update({
        ...query,
        where: { id: String(args.id) },
        data: { read: true },
      });
    },
  }),
);
