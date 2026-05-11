/**
 * GraphQL Yoga handler — /api/graphql endpoint'i.
 *
 * Her request'te Supabase Auth user'ı çıkarılıp context'e geçirilir.
 * GraphiQL playground dev mode'da aktif.
 */
import { createContext, schema } from '@niyet/graphql';
import { createYoga } from 'graphql-yoga';

import { createClient } from '@/lib/supabase/server';

const { handleRequest } = createYoga<{ req: Request }>({
  schema,
  context: async () => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return createContext({ authUserId: user?.id ?? null });
  },
  graphqlEndpoint: '/api/graphql',
  fetchAPI: { Response },
  graphiql: process.env.NODE_ENV !== 'production',
  cors: false,
});

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS };
