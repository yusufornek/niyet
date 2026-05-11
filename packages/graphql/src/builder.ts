/**
 * Pothos GraphQL builder — Niyet'in code-first schema fabrikası.
 *
 * Eklenmiş plugin'ler:
 *  - prisma: Prisma model'leri otomatik GraphQL tipi olarak expose
 *  - scope-auth: Authorization (authenticated, public scope'lar)
 *
 * Detay: ENGINEERING.md §12 (Agentic AI Mimarisi içinde data layer)
 */
import { prisma } from '@niyet/db';
import { Prisma } from '@prisma/client';
import SchemaBuilder from '@pothos/core';
import PrismaPlugin from '@pothos/plugin-prisma';
import ScopeAuthPlugin from '@pothos/plugin-scope-auth';
import SimpleObjectsPlugin from '@pothos/plugin-simple-objects';
import {
  DateTimeResolver,
  GraphQLJSON,
  NonNegativeFloatResolver,
  NonNegativeIntResolver,
} from 'graphql-scalars';

import type { GraphQLContext } from './context';
import type PrismaTypes from './generated/pothos-types';

export const builder = new SchemaBuilder<{
  Context: GraphQLContext;
  PrismaTypes: PrismaTypes;
  AuthScopes: {
    authenticated: boolean;
    public: boolean;
  };
  Scalars: {
    DateTime: { Input: Date; Output: Date };
    JSON: { Input: unknown; Output: unknown };
    NonNegativeFloat: { Input: number; Output: number };
    NonNegativeInt: { Input: number; Output: number };
  };
}>({
  // Pothos v4: plugin order matters — auth before others
  plugins: [ScopeAuthPlugin, PrismaPlugin, SimpleObjectsPlugin],
  scopeAuth: {
    // Demo aşamasında: userId varsa authenticated (Ayşe fallback dahil).
    // Production'da: real auth user için ctx.authId !== null kontrolüne geçilir.
    authScopes: async (ctx) => ({
      authenticated: ctx.userId !== null,
      public: true,
    }),
  },
  prisma: {
    client: prisma,
    dmmf: Prisma.dmmf,
    exposeDescriptions: true,
    filterConnectionTotalCount: true,
  },
});

// Scalar tipleri kaydet
builder.addScalarType('DateTime', DateTimeResolver);
builder.addScalarType('JSON', GraphQLJSON);
builder.addScalarType('NonNegativeFloat', NonNegativeFloatResolver);
builder.addScalarType('NonNegativeInt', NonNegativeIntResolver);

// Root tipleri — her query/mutation field kendi authScope'unu tanımlar
builder.queryType({});
builder.mutationType({});
