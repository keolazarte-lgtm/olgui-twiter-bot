import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * DEBUG v3: prueba con la nueva API key real y múltiples URLs.
 */
export async function GET(request: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    apiKey_preview: process.env.ZAI_API_KEY ? process.env.ZAI_API_KEY.substring(0, 10) + '...' : 'NOT SET',
    baseUrl_env: process.env.ZAI_BASE_URL || 'NOT SET',
    tests: [],
  }

  const apiKey = process.env.ZAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ZAI_API_KEY no está configurada en Vercel' }, { status: 500 })
  }

  const baseConfig = {
    apiKey,
    chatId: '',
    userId: '',
    token: '',
  }

  const urlsToTry = [
    'https://open.bigmodel.cn/api/paas/v4',
    'https://api.z.ai/api/paas/v4',
    'https://api.z.ai/v1',
  ]

  for (const baseUrl of urlsToTry) {
    const test: any = { baseUrl }
    try {
      // @ts-ignore
      const zai = new ZAI({ ...baseConfig, baseUrl })
      test.instance = 'OK'

      const response = await Promise.race([
        zai.images.generations.create({
          prompt: 'a red circle on white background',
          size: '1024x1024',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT 20s')), 20000)),
      ])

      test.success = true
      test.response_length = response?.data?.[0]?.base64?.length || 0
    } catch (e: any) {
      test.success = false
      test.error = e.message.substring(0, 300)
    }
    debug.tests.push(test)
  }

  return NextResponse.json(debug)
}
