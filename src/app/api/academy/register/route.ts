import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@libsql/client'

function getTursoClient() {
  const databaseUrl = process.env.DATABASE_URL || ''
  const tursoToken = process.env.TURSO_AUTH_TOKEN || ''

  if (!databaseUrl.startsWith('libsql://')) {
    return null
  }

  return createClient({
    url: databaseUrl,
    authToken: tursoToken,
  })
}

// Register a lead (email + phone) from the landing page
export async function POST(request: NextRequest) {
  try {
    const { email, phone } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    // Try to save to Turso DB
    const client = getTursoClient()
    if (client) {
      try {
        // Create table if not exists
        await client.execute(`
          CREATE TABLE IF NOT EXISTS AcademyLead (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL,
            phone TEXT,
            status TEXT DEFAULT 'pending',
            createdAt TEXT DEFAULT (datetime('now')),
            updatedAt TEXT DEFAULT (datetime('now'))
          )
        `)

        // Check if email already exists
        const existing = await client.execute({
          sql: 'SELECT id FROM AcademyLead WHERE email = ?',
          args: [email],
        })

        if (existing.rows.length > 0) {
          // Update existing lead
          await client.execute({
            sql: 'UPDATE AcademyLead SET phone = ?, updatedAt = datetime(\'now\') WHERE email = ?',
            args: [phone || null, email],
          })
        } else {
          // Insert new lead
          const id = crypto.randomUUID()
          await client.execute({
            sql: 'INSERT INTO AcademyLead (id, email, phone, status) VALUES (?, ?, ?, \'pending\')',
            args: [id, email, phone || null],
          })
        }

        console.log(`[DINASTÍA ACADEMY] Lead saved to DB: ${email} | Phone: ${phone || 'N/A'}`)
      } catch (dbError) {
        console.error('DB save failed, falling back to log:', dbError)
        console.log(`[DINASTÍA ACADEMY] New lead (log only): ${email} | Phone: ${phone || 'N/A'} | ${new Date().toISOString()}`)
      }
    } else {
      // Fallback: just log
      console.log(`[DINASTÍA ACADEMY] New lead (no DB): ${email} | Phone: ${phone || 'N/A'} | ${new Date().toISOString()}`)
    }

    return NextResponse.json({ success: true, message: 'Lead registered' })
  } catch (error) {
    console.error('Error registering lead:', error)
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}

// GET: list all leads (for admin)
export async function GET() {
  try {
    const client = getTursoClient()
    if (!client) {
      return NextResponse.json({ error: 'No database configured' }, { status: 500 })
    }

    const result = await client.execute('SELECT * FROM AcademyLead ORDER BY createdAt DESC')
    return NextResponse.json({ leads: result.rows })
  } catch (error) {
    console.error('Error fetching leads:', error)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
