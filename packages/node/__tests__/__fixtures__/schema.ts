import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  GraphQLString,
  GraphQLScalarType,
} from '@graphql-tools/graphql'
import { GraphQLBigInt as GraphQLJSBigInt } from 'graphql-scalars'
import { GraphQLLiveDirective } from '@envelop/live-query'

// @ts-expect-error this is okay since Config is compat between both
export const GraphQLBigInt = new GraphQLScalarType(GraphQLJSBigInt.toConfig())

export function createTestSchema() {
  let liveQueryCounter = 0

  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: () => ({
        alwaysFalse: {
          type: GraphQLBoolean,
          resolve: () => false,
        },
        alwaysTrue: {
          type: GraphQLBoolean,
          resolve: () => true,
        },
        echo: {
          args: {
            text: {
              type: GraphQLString,
            },
          },
          type: GraphQLString,
          resolve: (_root, args) => args.text,
        },
        hello: {
          type: GraphQLString,
          resolve: () => 'hello',
        },
        goodbye: {
          type: GraphQLString,
          resolve: () =>
            new Promise((resolve) =>
              setTimeout(() => resolve('goodbye'), 1000),
            ),
        },
        stream: {
          type: new GraphQLList(GraphQLString),
          async *resolve() {
            yield 'A'
            await new Promise((resolve) => setTimeout(resolve, 1000))
            yield 'B'
            await new Promise((resolve) => setTimeout(resolve, 1000))
            yield 'C'
          },
        },
        bigint: {
          type: GraphQLBigInt,
          resolve: () => BigInt('112345667891012345'),
        },
        liveCounter: {
          type: GraphQLInt,
          resolve: () => {
            liveQueryCounter++
            return liveQueryCounter
          },
        },
      }),
    }),
    mutation: new GraphQLObjectType({
      name: 'Mutation',
      fields: () => ({
        setFavoriteNumber: {
          args: {
            number: {
              type: GraphQLInt,
            },
          },
          type: GraphQLInt,
          resolve: (_root, args) => {
            return args.number
          },
        },
      }),
    }),
    subscription: new GraphQLObjectType({
      name: 'Subscription',
      fields: () => ({
        error: {
          type: GraphQLBoolean,
          // eslint-disable-next-line require-yield
          async *subscribe() {
            throw new Error('This is not okay')
          },
        },
        eventEmitted: {
          type: GraphQLFloat,
          async *subscribe() {
            yield { eventEmitted: Date.now() }
          },
        },
        count: {
          type: GraphQLInt,
          args: {
            to: {
              type: new GraphQLNonNull(GraphQLInt),
            },
          },
          async *subscribe(_root, args) {
            for (let count = 1; count <= args.to; count++) {
              yield { count }
              await new Promise((resolve) => setTimeout(resolve, 100))
            }
          },
        },
      }),
    }),
    directives: [GraphQLLiveDirective],
  })
}
