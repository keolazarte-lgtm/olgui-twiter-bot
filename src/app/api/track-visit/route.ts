import { NextRequest, NextResponse } from 'next/server'
import { recordVisit } from '@/lib/academy-db'

/**
 * Internal endpoint called by middleware (Edge runtime) to record a visit.
 * Middleware can't import the DB layer directly (Node.js modules),
 * so it fires a POST to this endpoint instead.
 *
 * Public — but only accepts internal calls (no auth required since
 * it only writes a visit log entry).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { ip, userAgent, path: visitPath, referer, method } = body

    // Basic validation
    if (!visitPath || typeof visitPath !== 'string') {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Don't log internal/API calls
    if (visitPath.startsWith('/api/') || visitPath.startsWith('/_next/')) {
      return NextResponse.json({ skipped: true })
    }

    await recordVisit({
      ip: ip || null,
      userAgent: userAgent || null,
      path: visitPath,
      referer: referer || null,
      method: method || 'GET',
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    // Silent failure — visits are best-effort
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
