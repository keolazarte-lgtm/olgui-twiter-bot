/**
 * Turso database client - uses libsql directly (no Prisma)
 * Used in production (Vercel) where Prisma adapter has issues.
 * Local development still uses Prisma + SQLite.
 */

import { createClient, type Client } from '@libsql/client'

let tursoClient: Client | null = null

function getTursoClient(): Client | null {
  const databaseUrl = process.env.DATABASE_URL || ''
  const tursoToken = process.env.TURSO_AUTH_TOKEN || ''

  if (!databaseUrl.startsWith('libsql://')) {
    return null // Not using Turso
  }

  if (!tursoClient) {
    tursoClient = createClient({
      url: databaseUrl,
      authToken: tursoToken,
    })
  }

  return tursoClient
}

export function isTurso(): boolean {
  const databaseUrl = process.env.DATABASE_URL || ''
  return databaseUrl.startsWith('libsql://')
}

// ─── TweetConfig ──────────────────────────────────────────

export async function tursoGetConfig() {
  const client = getTursoClient()
  if (!client) return null

  const result = await client.execute('SELECT * FROM TweetConfig LIMIT 1')
  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id as string,
    apiKey: row.apiKey as string | null,
    apiSecret: row.apiSecret as string | null,
    accessToken: row.accessToken as string | null,
    accessTokenSecret: row.accessTokenSecret as string | null,
    postIntervalHours: row.postIntervalHours as number,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

export async function tursoUpdateConfig(data: {
  apiKey?: string | null
  apiSecret?: string | null
  accessToken?: string | null
  accessTokenSecret?: string | null
  postIntervalHours?: number
  isActive?: boolean
}) {
  const client = getTursoClient()
  if (!client) return null

  const config = await tursoGetConfig()
  const id = config?.id || 'default'

  // If no config exists, create one
  if (!config) {
    await client.execute({
      sql: `INSERT INTO TweetConfig (id, apiKey, apiSecret, accessToken, accessTokenSecret, postIntervalHours, isActive)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, data.apiKey || null, data.apiSecret || null, data.accessToken || null,
             data.accessTokenSecret || null, data.postIntervalHours || 3, data.isActive !== undefined ? (data.isActive ? 1 : 0) : 1]
    })
    return tursoGetConfig()
  }

  // Update existing
  const sets: string[] = []
  const args: (string | number | null)[] = []

  if (data.apiKey !== undefined) { sets.push('apiKey = ?'); args.push(data.apiKey) }
  if (data.apiSecret !== undefined) { sets.push('apiSecret = ?'); args.push(data.apiSecret) }
  if (data.accessToken !== undefined) { sets.push('accessToken = ?'); args.push(data.accessToken) }
  if (data.accessTokenSecret !== undefined) { sets.push('accessTokenSecret = ?'); args.push(data.accessTokenSecret) }
  if (data.postIntervalHours !== undefined) { sets.push('postIntervalHours = ?'); args.push(data.postIntervalHours) }
  if (data.isActive !== undefined) { sets.push('isActive = ?'); args.push(data.isActive ? 1 : 0) }

  if (sets.length > 0) {
    sets.push('updatedAt = CURRENT_TIMESTAMP')
    args.push(id)
    await client.execute({
      sql: `UPDATE TweetConfig SET ${sets.join(', ')} WHERE id = ?`,
      args,
    })
  }

  return tursoGetConfig()
}

// ─── TweetContent ─────────────────────────────────────────

export async function tursoGetContent() {
  const client = getTursoClient()
  if (!client) return []

  const result = await client.execute('SELECT * FROM TweetContent ORDER BY createdAt DESC')
  return result.rows.map(row => ({
    id: row.id as string,
    type: row.type as string,
    text: row.text as string,
    mediaUrl: row.mediaUrl as string | null,
    status: row.status as string,
    postedAt: row.postedAt as string | null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }))
}

export async function tursoCreateContent(data: { type: string; text: string; mediaUrl?: string | null }) {
  const client = getTursoClient()
  if (!client) return null

  const id = crypto.randomUUID()
  await client.execute({
    sql: `INSERT INTO TweetContent (id, type, text, mediaUrl, status) VALUES (?, ?, ?, ?, 'pending')`,
    args: [id, data.type, data.text, data.mediaUrl || null]
  })

  const result = await client.execute({ sql: 'SELECT * FROM TweetContent WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return null

  const row = result.rows[0]
  return {
    id: row.id as string,
    type: row.type as string,
    text: row.text as string,
    mediaUrl: row.mediaUrl as string | null,
    status: row.status as string,
    postedAt: row.postedAt as string | null,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

export async function tursoUpdateContent(id: string, data: { status?: string }) {
  const client = getTursoClient()
  if (!client) return null

  const sets: string[] = []
  const args: (string | number | null)[] = []

  if (data.status !== undefined) {
    sets.push('status = ?')
    args.push(data.status)
    if (data.status === 'posted') {
      sets.push('postedAt = CURRENT_TIMESTAMP')
    } else {
      sets.push('postedAt = NULL')
    }
  }

  if (sets.length > 0) {
    sets.push('updatedAt = CURRENT_TIMESTAMP')
    args.push(id)
    await client.execute({
      sql: `UPDATE TweetContent SET ${sets.join(', ')} WHERE id = ?`,
      args,
    })
  }

  return tursoGetContent().then(items => items.find(i => i.id === id) || null)
}

export async function tursoDeleteContent(id: string) {
  const client = getTursoClient()
  if (!client) return

  // Get content first to delete associated file
  const content = await tursoGetContent().then(items => items.find(i => i.id === id))
  if (content?.mediaUrl) {
    try {
      const { deleteFile } = await import('./storage')
      await deleteFile(content.mediaUrl)
    } catch { /* ignore */ }
  }

  await client.execute({ sql: 'DELETE FROM TweetContent WHERE id = ?', args: [id] })
}

// ─── TweetSchedule ────────────────────────────────────────

export async function tursoGetSchedules() {
  const client = getTursoClient()
  if (!client) return []

  const result = await client.execute('SELECT * FROM TweetSchedule ORDER BY hourUtc ASC')
  return result.rows.map(row => ({
    id: row.id as string,
    hourUtc: row.hourUtc as number,
    timezone: row.timezone as string,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }))
}

export async function tursoCreateSchedule(data: { hourUtc: number; timezone: string }) {
  const client = getTursoClient()
  if (!client) return null

  const id = crypto.randomUUID()
  await client.execute({
    sql: `INSERT INTO TweetSchedule (id, hourUtc, timezone, isActive) VALUES (?, ?, ?, 1)`,
    args: [id, data.hourUtc, data.timezone]
  })

  const result = await client.execute({ sql: 'SELECT * FROM TweetSchedule WHERE id = ?', args: [id] })
  if (result.rows.length === 0) return null
  const row = result.rows[0]
  return {
    id: row.id as string,
    hourUtc: row.hourUtc as number,
    timezone: row.timezone as string,
    isActive: Boolean(row.isActive),
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
  }
}

export async function tursoDeleteSchedule(id: string) {
  const client = getTursoClient()
  if (!client) return
  await client.execute({ sql: 'DELETE FROM TweetSchedule WHERE id = ?', args: [id] })
}

export async function tursoToggleSchedule(id: string, isActive: boolean) {
  const client = getTursoClient()
  if (!client) return
  await client.execute({
    sql: 'UPDATE TweetSchedule SET isActive = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
    args: [isActive ? 1 : 0, id]
  })
}

// ─── TweetLog ─────────────────────────────────────────────

export async function tursoGetLogs() {
  const client = getTursoClient()
  if (!client) return []

  const result = await client.execute('SELECT * FROM TweetLog ORDER BY postedAt DESC')
  return result.rows.map(row => ({
    id: row.id as string,
    contentId: row.contentId as string | null,
    tweetId: row.tweetId as string | null,
    text: row.text as string,
    mediaUrl: row.mediaUrl as string | null,
    zone: row.zone as string,
    postedAt: row.postedAt as string,
    likes: row.likes as number,
    retweets: row.retweets as number,
    replies: row.replies as number,
    views: row.views as number,
    status: row.status as string,
    errorMsg: row.errorMsg as string | null,
  }))
}

export async function tursoCreateLog(data: {
  contentId?: string | null
  tweetId?: string | null
  text: string
  mediaUrl?: string | null
  zone: string
  status: string
  errorMsg?: string | null
}) {
  const client = getTursoClient()
  if (!client) return

  const id = crypto.randomUUID()
  await client.execute({
    sql: `INSERT INTO TweetLog (id, contentId, tweetId, text, mediaUrl, zone, status, errorMsg)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.contentId || null, data.tweetId || null, data.text,
           data.mediaUrl || null, data.zone, data.status, data.errorMsg || null]
  })
}
