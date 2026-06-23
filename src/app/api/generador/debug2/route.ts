import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * DEBUG v2: prueba con diferentes URLs para ver cuál anda desde Vercel.
 */
export async function GET(request: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    tests: [],
  }

  const config = {
    apiKey: process.env.ZAI_API_KEY || 'Z.ai',
    chatId: process.env.ZAI_CHAT_ID || '',
    userId: process.env.ZAI_USER_ID || '',
    token: process.env.ZAI_TOKEN || '',
  }

  // Probar varias URLs
  const urlsToTry = [
    'https://api.z.ai/v1',
    'https://open.bigmodel.cn/api/paas/v4',
    'https://internal-api.z.ai/v1',
  ]

  for (const baseUrl of urlsToTry) {
    const test: any = { baseUrl }
    try {
      // @ts-ignore
      const zai = new ZAI({ ...config, baseUrl })
      test.instance = 'OK'

      const response = await Promise.race([
        zai.images.generations.create({
          prompt: 'red circle',
          size: '1024x1024',
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT 15s')), 15000)),
      ])

      test.success = true
      test.response_length = response?.data?.[0]?.base64?.length || 0
    } catch (e: any) {
      test.success = false
      test.error = e.message
    }
    debug.tests.push(test)
  }

  return NextResponse.json(debug)
}
