/**
 * GraphQL Yoga handler — /api/graphql endpoint'i.
 * GraphiQL playground dev mode'da otomatik aktif.
 */
import { createContext, schema } from '@niyet/graphql';
import { createYoga } from 'graphql-yoga';

const { handleRequest } = createYoga<{
  req: Request;
}>({
  schema,
  context: async () => createContext(),
  graphqlEndpoint: '/api/graphql',
  // Next.js App Router için Response convention
  fetchAPI: { Response },
  graphiql: process.env.NODE_ENV !== 'production',
  cors: false, // Same-origin only
});

export { handleRequest as GET, handleRequest as POST, handleRequest as OPTIONS };
