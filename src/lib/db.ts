import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { createClient } from '@libsql/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const tursoToken = process.env.TURSO_AUTH_TOKEN || ''

  // CRITICAL: PrismaClient always validates DATABASE_URL, even with an adapter.
  // When using Turso (libsql://), we need to set a valid dummy URL for Prisma's
  // internal validation, then use the adapter for actual connections.
  if (databaseUrl.startsWith('libsql://') || databaseUrl.startsWith('http://') || databaseUrl.startsWith('https://')) {
    console.log('[DB] Connecting to Turso:', databaseUrl.substring(0, 30) + '...')
    try {
      const libsql = createClient({
        url: databaseUrl,
        authToken: tursoToken,
      })
      const adapter = new PrismaLibSql(libsql)

      // Override DATABASE_URL with a valid format for Prisma's internal validation
      // The adapter will handle the actual connection
      const originalUrl = process.env.DATABASE_URL
      process.env.DATABASE_URL = 'file:./tmp/turso-dummy.db'
      const client = new PrismaClient({ adapter, log: ['error'] })
      // Restore original URL
      process.env.DATABASE_URL = originalUrl

      return client
    } catch (error) {
      console.error('[DB] Turso adapter failed:', error)
    }
  }

  // Local SQLite - standard Prisma
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./db/custom.db'
  }
  console.log('[DB] Using local SQLite')
  return new PrismaClient({ log: ['error'] })
}

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
