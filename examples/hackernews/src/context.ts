import { PrismaClient } from '@prisma/client'

export type GraphQLContext = {
  prisma: PrismaClient
}

export async function createContext(): Promise<GraphQLContext> {
  const prisma = new PrismaClient()
  return {
    prisma,
  }
}
