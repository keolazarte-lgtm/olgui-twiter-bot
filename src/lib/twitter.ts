/**
 * Twitter API v2 integration with OAuth 1.0a
 * Supports: posting tweets, uploading media, reading tweet stats
 */

import OAuth from 'oauth-1.0a'
import crypto from 'crypto'

interface TwitterConfig {
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
}

interface TweetResult {
  success: boolean
  tweetId?: string
  tweetUrl?: string
  error?: string
}

interface TweetStats {
  likes: number
  retweets: number
  replies: number
  views: number
}

/**
 * Get Twitter config from database
 */
export async function getTwitterConfig(): Promise<TwitterConfig | null> {
  const { isTurso, tursoGetConfig } = await import('./turso')
  
  if (isTurso()) {
    const config = await tursoGetConfig()
    if (!config?.apiKey || !config?.apiSecret || !config?.accessToken || !config?.accessTokenSecret) {
      return null
    }
    return {
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      accessToken: config.accessToken,
      accessTokenSecret: config.accessTokenSecret,
    }
  }

  const { db } = await import('./db')
  const config = await db.tweetConfig.findFirst()
  if (!config?.apiKey || !config?.apiSecret || !config?.accessToken || !config?.accessTokenSecret) {
    return null
  }
  return {
    apiKey: config.apiKey,
    apiSecret: config.apiSecret,
    accessToken: config.accessToken,
    accessTokenSecret: config.accessTokenSecret,
  }
}

/**
 * Create OAuth 1.0a authorization header
 */
function createOAuthHeader(
  config: TwitterConfig,
  method: string,
  url: string,
  params?: Record<string, string>
): string {
  const oauth = new OAuth({
    consumer: {
      key: config.apiKey,
      secret: config.apiSecret,
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString: string, key: string) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64')
    },
  })

  const token = {
    key: config.accessToken,
    secret: config.accessTokenSecret,
  }

  const requestData: OAuth.RequestOptions = {
    url,
    method,
  }

  if (params) {
    requestData.data = params
  }

  const authData = oauth.authorize(requestData, token)
  return oauth.toHeader(authData)['Authorization']
}

/**
 * Upload media to Twitter (images for tweets)
 * Returns media_id_string to attach to tweet
 */
export async function uploadMedia(
  config: TwitterConfig,
  imageBuffer: Buffer,
  mimeType: string = 'image/png'
): Promise<string> {
  const url = 'https://upload.twitter.com/1.1/media/upload.json'

  const formData = new FormData()
  formData.append('media_data', imageBuffer.toString('base64'))

  const authHeader = createOAuthHeader(config, 'POST', url)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Media upload error:', errorText)
    throw new Error(`Media upload failed: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.media_id_string
}

/**
 * Upload media from URL (downloads image first, then uploads to Twitter)
 */
export async function uploadMediaFromUrl(
  config: TwitterConfig,
  imageUrl: string
): Promise<string> {
  // Download the image
  const imageResponse = await fetch(imageUrl)
  if (!imageResponse.ok) {
    throw new Error(`Failed to download image: ${imageResponse.status}`)
  }

  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer())
  const contentType = imageResponse.headers.get('content-type') || 'image/png'

  return uploadMedia(config, imageBuffer, contentType)
}

/**
 * Post a tweet with optional media attachment
 */
export async function postTweet(
  config: TwitterConfig,
  text: string,
  mediaUrl?: string
): Promise<TweetResult> {
  try {
    const url = 'https://api.twitter.com/2/tweets'

    const tweetData: Record<string, unknown> = {
      text: text.substring(0, 280), // Twitter limit
    }

    // Upload media if provided
    if (mediaUrl) {
      try {
        let mediaId: string

        if (mediaUrl.startsWith('http')) {
          // Cloud URL (Vercel Blob) - download then upload
          mediaId = await uploadMediaFromUrl(config, mediaUrl)
        } else {
          // Local path - read from filesystem (dev only)
          const { readFile } = await import('fs/promises')
          const path = await import('path')
          const filepath = path.join(process.cwd(), 'public', mediaUrl)
          const imageBuffer = await readFile(filepath)
          mediaId = await uploadMedia(config, imageBuffer)
        }

        tweetData.media = {
          media_ids: [mediaId],
        }
      } catch (mediaError) {
        console.error('Media upload failed, posting text-only:', mediaError)
        // Continue without media if upload fails
      }
    }

    const authHeader = createOAuthHeader(config, 'POST', url)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tweetData),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Tweet post error:', errorText)
      
      // Parse Twitter error for user-friendly messages
      let userFriendlyError = `Twitter API error ${response.status}`
      try {
        const errorJson = JSON.parse(errorText)
        if (errorJson.title === 'CreditsDepleted') {
          userFriendlyError = 'Sin créditos de Twitter. Cargá créditos en https://console.x.com ($5 = ~333 tweets)'
        } else if (errorJson.detail) {
          userFriendlyError = errorJson.detail
        } else if (errorJson.title) {
          userFriendlyError = errorJson.title
        }
      } catch { /* keep default */ }

      return {
        success: false,
        error: userFriendlyError,
      }
    }

    const data = await response.json()
    const tweetId = data.data?.id

    return {
      success: true,
      tweetId,
      tweetUrl: tweetId ? `https://twitter.com/i/web/status/${tweetId}` : undefined,
    }
  } catch (error) {
    console.error('Tweet post exception:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get tweet engagement stats
 */
export async function getTweetStats(
  config: TwitterConfig,
  tweetId: string
): Promise<TweetStats | null> {
  try {
    const url = `https://api.twitter.com/2/tweets/${tweetId}?tweet.fields=public_metrics`

    const authHeader = createOAuthHeader(config, 'GET', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    })

    if (!response.ok) {
      console.error('Get tweet stats error:', await response.text())
      return null
    }

    const data = await response.json()
    const metrics = data.data?.public_metrics

    return {
      likes: metrics?.like_count || 0,
      retweets: metrics?.retweet_count || 0,
      replies: metrics?.reply_count || 0,
      views: metrics?.impression_count || 0,
    }
  } catch (error) {
    console.error('Get tweet stats exception:', error)
    return null
  }
}

/**
 * Verify Twitter API credentials are valid
 */
export async function verifyCredentials(config: TwitterConfig): Promise<boolean> {
  try {
    const url = 'https://api.twitter.com/1.1/account/verify_credentials.json'
    const authHeader = createOAuthHeader(config, 'GET', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
    })

    return response.ok
  } catch {
    return false
  }
}
