import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const config = await db.tweetConfig.findFirst()
    if (!config) {
      // Create default config
      const newConfig = await db.tweetConfig.create({ data: {} })
      return NextResponse.json(newConfig)
    }
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching config:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to fetch config', detail: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()

    let config = await db.tweetConfig.findFirst()
    if (!config) {
      config = await db.tweetConfig.create({ data: {} })
    }

    const updated = await db.tweetConfig.update({
      where: { id: config.id },
      data: {
        apiKey: body.apiKey !== undefined ? body.apiKey : config.apiKey,
        apiSecret: body.apiSecret !== undefined ? body.apiSecret : config.apiSecret,
        accessToken: body.accessToken !== undefined ? body.accessToken : config.accessToken,
        accessTokenSecret: body.accessTokenSecret !== undefined ? body.accessTokenSecret : config.accessTokenSecret,
        postIntervalHours: body.postIntervalHours !== undefined ? body.postIntervalHours : config.postIntervalHours,
        isActive: body.isActive !== undefined ? body.isActive : config.isActive,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating config:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to update config', detail: message }, { status: 500 })
  }
}
