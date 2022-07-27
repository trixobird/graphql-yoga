import * as apolloImport from '@apollo/client'
import { getOperationAST, print as defaultPrint } from 'graphql'

const apollo: typeof apolloImport =
  (apolloImport as any)?.default ?? apolloImport

const DEFAULT_OPTIONS = {
  includeExtensions: false,
  fetch: globalThis.fetch,
  print: defaultPrint,
} as const

function createYogaApolloRequestHandler(
  globalOptions: apolloImport.HttpOptions = {},
): apolloImport.RequestHandler {
  return function graphQLYogaApolloRequestHandler(
    operation: apolloImport.Operation,
  ): apolloImport.Observable<apolloImport.FetchResult> {
    return new apollo.Observable((observer) => {
      const operationOptions = Object.assign(
        {},
        DEFAULT_OPTIONS,
        globalOptions,
        operation.getContext(),
      )
      const endpoint =
        typeof operationOptions.uri === 'function'
          ? operationOptions.uri(operation)
          : operationOptions.uri ?? '/graphql'
      const searchParams = new URLSearchParams()
      searchParams.append('query', operationOptions.print(operation.query))
      searchParams.append('variables', JSON.stringify(operation.variables))
      if (operationOptions.includeExtensions) {
        searchParams.append('extensions', JSON.stringify(operation.extensions))
      }

      operationOptions
        .fetch(endpoint + '?' + searchParams.toString(), {
          method: 'GET',
          headers: {
            Accept: 'text/event-stream',
            ...operationOptions.headers,
          },
        })
        .then(async (response) => {
          if (response.body != null) {
            const textDecoderStream = new TextDecoderStream()
            const decodedStream = response.body.pipeThrough(textDecoderStream)
            const reader = decodedStream.getReader()
            outer: while (true) {
              if (observer.closed) {
                reader.releaseLock()
                break
              }
              const { value, done } = await reader.read()
              if (value) {
                for (const part of value.split('\n\n')) {
                  if (part) {
                    const eventStr = part.split('event: ')[1]
                    const dataStr = part.split('data: ')[1]
                    if (eventStr === 'complete') {
                      break outer
                    }
                    if (dataStr) {
                      const data = JSON.parse(dataStr)
                      observer.next(data)
                    }
                  }
                }
              }
              if (done) {
                break
              }
            }
          }
        })
        .catch((error) => {
          if (!observer.closed) {
            observer.error(error)
          }
        })
        .finally(() => {
          if (!observer.closed) {
            observer.complete()
          }
        })
    })
  }
}

export class SSELink extends apollo.ApolloLink {
  constructor(options: apolloImport.HttpOptions) {
    super(createYogaApolloRequestHandler(options))
  }
}
