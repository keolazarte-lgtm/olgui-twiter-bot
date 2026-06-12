import { db } from '@/lib/db'
import { getTwitterConfig, postTweet } from '@/lib/twitter'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/tweets/post — Publish a specific content item to Twitter immediately

export async function POST(request: NextRequest) {
  try {
    const { contentId } = await request.json()

    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 })
    }

    // Get the content
    const content = await db.tweetContent.findUnique({ where: { id: contentId } })
    if (!content) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 })
    }

    // Get Twitter config
    const twitterConfig = await getTwitterConfig()
    if (!twitterConfig) {
      return NextResponse.json({ error: 'Twitter API not configured. Add your API keys in Config.' }, { status: 400 })
    }

    // Post to Twitter
    const result = await postTweet(twitterConfig, content.text, content.mediaUrl || undefined)

    // Log the attempt
    await db.tweetLog.create({
      data: {
        contentId: content.id,
        tweetId: result.tweetId || null,
        text: content.text,
        mediaUrl: content.mediaUrl,
        zone: 'manual',
        status: result.success ? 'posted' : 'failed',
        errorMsg: result.error || null,
      },
    })

    // Update content status
    if (result.success) {
      await db.tweetContent.update({
        where: { id: content.id },
        data: { status: 'posted', postedAt: new Date() },
      })
    }

    return NextResponse.json({
      success: result.success,
      tweetId: result.tweetId,
      tweetUrl: result.tweetUrl,
      error: result.error,
    })
  } catch (error) {
    console.error('Manual post error:', error)
    return NextResponse.json({ error: 'Failed to post tweet' }, { status: 500 })
  }
}

// GET /api/tweets/post — Test Twitter API connection

export async function GET() {
  try {
    const twitterConfig = await getTwitterConfig()
    if (!twitterConfig) {
      return NextResponse.json({
        configured: false,
        message: 'Twitter API keys not configured',
      })
    }

    // Just check if keys exist (don't verify to avoid rate limits)
    return NextResponse.json({
      configured: true,
      message: 'Twitter API keys are configured',
      hasApiKey: !!twitterConfig.apiKey,
      hasApiSecret: !!twitterConfig.apiSecret,
      hasAccessToken: !!twitterConfig.accessToken,
      hasAccessTokenSecret: !!twitterConfig.accessTokenSecret,
    })
  } catch (error) {
    return NextResponse.json({ configured: false, error: 'Failed to check config' }, { status: 500 })
  }
}
