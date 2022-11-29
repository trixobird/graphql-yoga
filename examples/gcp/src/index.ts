import { createSchema, createYoga } from 'graphql-yoga'

export const yoga = createYoga({
  schema: createSchema({
    typeDefs: /* GraphQL */ `
      type Query {
        greetings: String
      }
    `,
    resolvers: {
      Query: {
        greetings: () =>
          'This is the `greetings` field of the root `Query` type',
      },
    },
  }),
  // Due to the missing information about the actual path from GCP, we need to set it to `/`
  graphqlEndpoint: '/',
})
