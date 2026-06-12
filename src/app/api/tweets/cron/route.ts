import { db } from '@/lib/db'
import { isTurso, tursoGetConfig, tursoGetLastLog, tursoGetActiveScheduleByHour, tursoGetNextPending, tursoResetPostedContent, tursoUpdateContent, tursoCreateLog } from '@/lib/turso'
import { getTwitterConfig, postTweet } from '@/lib/twitter'
import { NextResponse } from 'next/server'

// This endpoint is called by a cron service (cron-job.org or Vercel Cron)
// It picks the next pending content and posts it to Twitter

export async function GET() {
  try {
    // Check if bot is active
    let config
    if (isTurso()) {
      config = await tursoGetConfig()
    } else {
      config = await db.tweetConfig.findFirst()
    }

    if (!config || !config.isActive || !config.apiKey) {
      return NextResponse.json({ status: 'inactive', message: 'Bot not configured or inactive' })
    }

    // Check if we already posted recently
    let lastLog
    if (isTurso()) {
      lastLog = await tursoGetLastLog()
    } else {
      lastLog = await db.tweetLog.findFirst({
        orderBy: { postedAt: 'desc' },
      })
    }

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
    let activeSchedule

    if (isTurso()) {
      activeSchedule = await tursoGetActiveScheduleByHour(currentHourUtc)
    } else {
      activeSchedule = await db.tweetSchedule.findFirst({
        where: {
          hourUtc: currentHourUtc,
          isActive: true,
        },
      })
    }

    if (!activeSchedule) {
      return NextResponse.json({ status: 'skipped', message: `No active schedule for hour ${currentHourUtc} UTC` })
    }

    // Get next pending content
    let nextContent
    if (isTurso()) {
      nextContent = await tursoGetNextPending()
    } else {
      nextContent = await db.tweetContent.findFirst({
        where: { status: 'pending' },
        orderBy: { createdAt: 'asc' },
      })
    }

    if (!nextContent) {
      // Reset all posted content back to pending (rotation)
      if (isTurso()) {
        await tursoResetPostedContent()
        nextContent = await tursoGetNextPending()
      } else {
        await db.tweetContent.updateMany({
          where: { status: 'posted' },
          data: { status: 'pending', postedAt: null },
        })
        nextContent = await db.tweetContent.findFirst({
          where: { status: 'pending' },
          orderBy: { createdAt: 'asc' },
        })
      }
    }

    if (!nextContent) {
      return NextResponse.json({ status: 'empty', message: 'No content available' })
    }

    // Post to Twitter using our twitter lib
    const twitterConfig = await getTwitterConfig()
    if (!twitterConfig) {
      return NextResponse.json({ status: 'error', message: 'Twitter API not configured' })
    }

    const result = await postTweet(twitterConfig, nextContent.text, nextContent.mediaUrl || undefined)

    // Log the attempt
    if (isTurso()) {
      await tursoCreateLog({
        contentId: nextContent.id,
        tweetId: result.tweetId || null,
        text: nextContent.text,
        mediaUrl: nextContent.mediaUrl,
        zone: activeSchedule.timezone,
        status: result.success ? 'posted' : 'failed',
        errorMsg: result.error || null,
      })
    } else {
      await db.tweetLog.create({
        data: {
          contentId: nextContent.id,
          tweetId: result.tweetId || null,
          text: nextContent.text,
          mediaUrl: nextContent.mediaUrl,
          zone: activeSchedule.timezone,
          status: result.success ? 'posted' : 'failed',
          errorMsg: result.error || null,
        },
      })
    }

    // Mark content as posted
    if (result.success) {
      if (isTurso()) {
        await tursoUpdateContent(nextContent.id, { status: 'posted' })
      } else {
        await db.tweetContent.update({
          where: { id: nextContent.id },
          data: { status: 'posted', postedAt: new Date() },
        })
      }
    }

    return NextResponse.json({
      status: result.success ? 'posted' : 'failed',
      tweetId: result.tweetId,
      tweetUrl: result.tweetUrl,
      content: nextContent.text.substring(0, 50) + '...',
      zone: activeSchedule.timezone,
      error: result.error,
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({ status: 'error', message: 'Internal server error' }, { status: 500 })
  }
}
