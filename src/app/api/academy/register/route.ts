import { NextRequest, NextResponse } from 'next/server'

// Register a lead (email + phone) from the landing page
export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Log the lead - in production save to DB or send notification
    console.log(`[DINASTÍA ACADEMY] New lead: ${email} | Phone: ${phone || 'N/A'} | ${new Date().toISOString()}`)

    return NextResponse.json({ success: true, message: 'Lead registered' })
  } catch (error) {
    console.error('Error registering lead:', error)
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}
