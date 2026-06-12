import { db } from '@/lib/db'
import { isTurso, tursoGetLogs } from '@/lib/turso'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    if (isTurso()) {
      const logs = await tursoGetLogs()
      return NextResponse.json(logs)
    }

    const logs = await db.tweetLog.findMany({
      orderBy: { postedAt: 'desc' },
      take: 50,
    })
    return NextResponse.json(logs)
  } catch (error) {
    console.error('Error fetching logs:', error)
    return NextResponse.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
