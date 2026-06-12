import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const tursoToken = process.env.TURSO_AUTH_TOKEN || ''

  // If using Turso (cloud), use the libsql adapter
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('http://') || databaseUrl.startsWith('https://')) {
    console.log('[DB] Connecting to Turso:', databaseUrl.substring(0, 30) + '...')
    try {
      const libsql = createClient({
        url: databaseUrl,
        authToken: tursoToken,
      })
      const adapter = new PrismaLibSql(libsql)
      return new PrismaClient({ adapter, log: ['error'] })
    } catch (error) {
      console.error('[DB] Turso adapter failed, falling back:', error)
    }
  }

  // Local SQLite - standard Prisma
  const localUrl = databaseUrl || 'file:./db/custom.db'
  console.log('[DB] Using local SQLite:', localUrl)
  return new PrismaClient({ log: ['error'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
