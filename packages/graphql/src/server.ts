import { createServer } from 'node:http';
import { pathToFileURL } from 'node:url';
import { createYoga } from 'graphql-yoga';
import { createContext, type CreateContextOptions } from './context.js';
import { schema } from './goal-tracking/schema.js';

export function createGraphQLYoga(contextOptions: Omit<CreateContextOptions, 'request'> = {}) {
  return createYoga({
    schema,
    graphqlEndpoint: '/graphql',
    logging: process.env.NODE_ENV === 'test' ? false : undefined,
    context: ({ request }) =>
      createContext({
        ...contextOptions,
        request
      })
  });
}

export function startGraphQLServer(port = Number(process.env.PORT ?? 4000)) {
  const yoga = createGraphQLYoga();
  const server = createServer(yoga);

  server.listen(port, () => {
    console.log(`Niyet GraphQL service listening on http://localhost:${port}/graphql`);
  });

  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startGraphQLServer();
}
