import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaAdapter?: PrismaPg }

function createAdapter(): PrismaPg {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Prisma Client.')
  }

  return new PrismaPg(new Pool({ connectionString }))
}

const adapter = globalForPrisma.prismaAdapter ?? createAdapter()

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaAdapter = adapter
  globalForPrisma.prisma = prisma
}
