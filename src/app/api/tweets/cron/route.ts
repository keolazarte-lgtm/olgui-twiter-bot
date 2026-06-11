import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// This endpoint is called by a cron service (cron-job.org or Vercel Cron)
// It picks the next pending content and posts it to Twitter

export async function GET() {
  try {
    // Check if bot is active
    const config = await db.tweetConfig.findFirst()
    if (!config || !config.isActive || !config.apiKey) {
      return NextResponse.json({ status: 'inactive', message: 'Bot not configured or inactive' })
    }

    // Check if we already posted recently
    const lastLog = await db.tweetLog.findFirst({
      orderBy: { postedAt: 'desc' },
    })
    if (lastLog) {
      const minutesSinceLastPost = (Date.now() - new Date(lastLog.postedAt).getTime()) / 60000
      const minInterval = (config.postIntervalHours || 3) * 60
      if (minutesSinceLastPost < minInterval) {
        return NextResponse.json({
          status: 'skipped',
          message: `Too soon — last post was ${Math.round(minutesSinceLastPost)}m ago, need ${minInterval}m`,
        })
      }
    }

    // Get current UTC hour and find matching schedule
    const currentHourUtc = new Date().getUTCHours()
    const activeSchedule = await db.tweetSchedule.findFirst({
      where: {
        hourUtc: currentHourUtc,
        isActive: true,
      },
    })

    if (!activeSchedule) {
      return NextResponse.json({ status: 'skipped', message: `No active schedule for hour ${currentHourUtc} UTC` })
    }

    // Get next pending content (rotate through types)
    const nextContent = await db.tweetContent.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })

    if (!nextContent) {
      // Reset all posted content back to pending (rotation)
      await db.tweetContent.updateMany({
        where: { status: 'posted' },
        data: { status: 'pending', postedAt: null },
      })

      const resetContent = await db.tweetContent.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
      })

      if (!resetContent) {
        return NextResponse.json({ status: 'empty', message: 'No content available' })
      }
    }

    const contentToPost = nextContent || await db.tweetContent.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    })

    if (!contentToPost) {
      return NextResponse.json({ status: 'empty', message: 'No content available' })
    }

    // Try to post to Twitter
    let tweetId: string | null = null
    let postStatus = 'posted'
    let errorMsg: string | null = null

    try {
      const tweetResult = await postToTwitter(config, contentToPost.text, contentToPost.mediaUrl)
      tweetId = tweetResult.data?.id || null
    } catch (error: any) {
      postStatus = 'failed'
      errorMsg = error.message || 'Unknown error posting to Twitter'
      console.error('Twitter post error:', errorMsg)
    }

    // Log the attempt
    await db.tweetLog.create({
      data: {
        contentId: contentToPost.id,
        tweetId,
        text: contentToPost.text,
        mediaUrl: contentToPost.mediaUrl,
        zone: activeSchedule.timezone,
        status: postStatus,
        errorMsg,
      },
    })

    // Mark content as posted
    if (postStatus === 'posted') {
      await db.tweetContent.update({
        where: { id: contentToPost.id },
        data: { status: 'posted', postedAt: new Date() },
      })
    }

    return NextResponse.json({
      status: postStatus,
      tweetId,
      content: contentToPost.text.substring(0, 50) + '...',
      zone: activeSchedule.timezone,
      error: errorMsg,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 })
  }
}

async function postToTwitter(config: any, text: string, mediaUrl: string | null) {
  // Twitter API v2 with OAuth 1.0a
  const crypto = await import('crypto')

  const oauth = {
    consumer_key: config.apiKey,
    consumer_secret: config.apiSecret,
    token: config.accessToken,
    token_secret: config.accessTokenSecret,
  }

  // If there's media, we need to upload it first via v1.1, then create tweet via v2
  // For now, text-only tweets via v2
  const url = 'https://api.twitter.com/2/tweets'

  const body = JSON.stringify({
    text: text,
  })

  // Generate OAuth 1.0a signature
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const nonce = crypto.randomBytes(16).toString('hex')

  const method = 'POST'
  const baseURL = url

  const params: Record<string, string> = {
    oauth_consumer_key: oauth.consumer_key,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: oauth.token,
    oauth_version: '1.0',
  }

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(baseURL),
    encodeURIComponent(
      Object.keys(params)
        .sort()
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
        .join('&')
    ),
  ].join('&')

  const signingKey = `${encodeURIComponent(oauth.consumer_secret)}&${encodeURIComponent(oauth.token_secret)}`
  const signature = crypto.createHmac('sha1', signingKey).update(signatureBaseString).digest('base64')

  const authHeader = `OAuth ${Object.entries({
    ...params,
    oauth_signature: signature,
  })
    .map(([k, v]) => `${encodeURIComponent(k)}="${encodeURIComponent(v)}"`)
    .join(', ')}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
    body,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Twitter API error ${response.status}: ${errorBody}`)
  }

  return response.json()
}
