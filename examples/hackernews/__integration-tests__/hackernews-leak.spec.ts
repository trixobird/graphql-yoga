import { createContext, GraphQLContext } from '../src/context'

describe('hackernews leak example', () => {
  let context: GraphQLContext
  beforeAll(async () => {
    context = await createContext()
  })

  it('dummy', () => {})
})
