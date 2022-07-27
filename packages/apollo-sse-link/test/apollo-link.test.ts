import { ApolloClient, FetchResult, InMemoryCache } from '@apollo/client/core'
import { createYoga } from 'graphql-yoga'
import { createServer } from 'http'
import { parse } from 'graphql'
import { observableToAsyncIterable } from '@graphql-tools/utils'
import { SSELink } from '../src'

describe('Apollo SSE Link', () => {
  const port = 4000 + Math.floor(Math.random() * 1000)
  const endpoint = '/graphql'
  const hostname = '127.0.0.1'
  const yoga = createYoga({
    endpoint,
    logging: false,
    maskedErrors: false,
    schema: {
      typeDefs: /* GraphQL */ `
        scalar File
        type Query {
          _: String
        }
        type Subscription {
          time: String
        }
      `,
      resolvers: {
        Subscription: {
          time: {
            async *subscribe() {
              while (true) {
                await new Promise((resolve) => setTimeout(resolve, 1000))
                yield new Date().toISOString()
              }
            },
            resolve: (str) => str,
          },
        },
      },
    },
  })
  const server = createServer(yoga)
  const uri = `http://${hostname}:${port}${endpoint}`
  const client = new ApolloClient({
    link: new SSELink({
      uri,
    }),
    cache: new InMemoryCache(),
  })
  beforeAll(async () => {
    await new Promise<void>((resolve) => server.listen(port, hostname, resolve))
  })
  afterAll(() => {
    server.close()
  })
  it('should handle subscriptions correctly', async () => {
    const observable = client.subscribe({
      query: parse(/* GraphQL */ `
        subscription Time {
          time
        }
      `),
    })
    const asyncIterable =
      observableToAsyncIterable<
        FetchResult<any, Record<string, any>, Record<string, any>>
      >(observable)
    let i = 0
    for await (const result of asyncIterable) {
      i++
      if (i === 2) {
        break
      }
      expect(result.errors?.length).toBeFalsy()
      const date = new Date(result?.data?.time)
      expect(date.getFullYear()).toBe(new Date().getFullYear())
    }
    expect(i).toBe(2)
  })
})
