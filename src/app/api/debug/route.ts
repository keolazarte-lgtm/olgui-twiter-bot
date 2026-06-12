import { NextResponse } from 'next/server'

// Debug endpoint - check if env vars are available
export async function GET() {
  const databaseUrl = process.env.DATABASE_URL || 'NOT SET'
  const tursoToken = process.env.TURSO_AUTH_TOKEN || 'NOT SET'
  const isVercel = process.env.VERCEL || 'NOT SET'

  return NextResponse.json({
    VERCEL: isVercel,
    DATABASE_URL: databaseUrl.startsWith('libsql') ? databaseUrl.substring(0, 30) + '...' : databaseUrl,
    TURSO_AUTH_TOKEN: tursoToken === 'NOT SET' ? 'NOT SET' : tursoToken.substring(0, 10) + '...',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
  })
}
