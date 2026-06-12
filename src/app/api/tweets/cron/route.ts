import { db } from '@/lib/db'
import { getTwitterConfig, postTweet } from '@/lib/twitter'
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

    // Get next pending content
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

    // Post to Twitter using our twitter lib
    const twitterConfig = await getTwitterConfig()
    if (!twitterConfig) {
      return NextResponse.json({ status: 'error', message: 'Twitter API not configured' })
    }

    const result = await postTweet(twitterConfig, contentToPost.text, contentToPost.mediaUrl || undefined)

    // Log the attempt
    await db.tweetLog.create({
      data: {
        contentId: contentToPost.id,
        tweetId: result.tweetId || null,
        text: contentToPost.text,
        mediaUrl: contentToPost.mediaUrl,
        zone: activeSchedule.timezone,
        status: result.success ? 'posted' : 'failed',
        errorMsg: result.error || null,
      },
    })

    // Mark content as posted
    if (result.success) {
      await db.tweetContent.update({
        where: { id: contentToPost.id },
        data: { status: 'posted', postedAt: new Date() },
      })
    }

    return NextResponse.json({
      status: result.success ? 'posted' : 'failed',
      tweetId: result.tweetId,
      tweetUrl: result.tweetUrl,
      content: contentToPost.text.substring(0, 50) + '...',
      zone: activeSchedule.timezone,
      error: result.error,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 })
  }
}
