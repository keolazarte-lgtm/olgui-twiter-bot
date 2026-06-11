import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const entry = await db.waitlistEntry.create({
      data: {
        email: body.email,
        name: body.name || null,
        niche: body.niche || null,
      },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
    }
    console.error('Error adding to waitlist:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
