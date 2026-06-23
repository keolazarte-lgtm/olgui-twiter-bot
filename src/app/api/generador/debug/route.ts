import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * ENDPOINT TEMPORAL DE DEBUG
 * Lista todas las variables ZAI_* y prueba inicializar el SDK.
 * Lo borramos cuando terminemos de diagnosticar.
 */
export async function GET(request: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    env: {
      ZAI_BASE_URL: process.env.ZAI_BASE_URL ? `SET (${process.env.ZAI_BASE_URL.length} chars)` : 'NOT SET',
      ZAI_API_KEY: process.env.ZAI_API_KEY ? `SET (${process.env.ZAI_API_KEY.length} chars)` : 'NOT SET',
      ZAI_CHAT_ID: process.env.ZAI_CHAT_ID ? `SET (${process.env.ZAI_CHAT_ID.length} chars)` : 'NOT SET',
      ZAI_USER_ID: process.env.ZAI_USER_ID ? `SET (${process.env.ZAI_USER_ID.length} chars)` : 'NOT SET',
      ZAI_TOKEN: process.env.ZAI_TOKEN ? `SET (${process.env.ZAI_TOKEN.length} chars)` : 'NOT SET',
    },
    steps: [],
  }

  try {
    debug.steps.push('1. Verificando variables...')

    if (!process.env.ZAI_BASE_URL || !process.env.ZAI_API_KEY) {
      debug.steps.push('1a. FALTAN VARIABLES ZAI_BASE_URL o ZAI_API_KEY')
      debug.error = 'Missing env vars'
      return NextResponse.json(debug, { status: 500 })
    }

    debug.steps.push('1a. Variables OK. Creando instancia ZAI...')

    const config = {
      baseUrl: process.env.ZAI_BASE_URL,
      apiKey: process.env.ZAI_API_KEY,
      chatId: process.env.ZAI_CHAT_ID || '',
      userId: process.env.ZAI_USER_ID || '',
      token: process.env.ZAI_TOKEN || '',
    }
    debug.config = { ...config, apiKey: config.apiKey.substring(0, 4) + '...', token: config.token.substring(0, 20) + '...' }

    // @ts-ignore
    const zai = new ZAI(config)
    debug.steps.push('2. Instancia ZAI creada OK')

    debug.steps.push('3. Llamando a images.generations.create con prompt de prueba...')
    const response = await zai.images.generations.create({
      prompt: 'a simple red circle on white background',
      size: '1024x1024',
    })

    debug.steps.push('4. Response recibida OK')
    debug.response_length = response?.data?.[0]?.base64?.length || 0
    debug.success = true

    return NextResponse.json(debug)
  } catch (error: any) {
    debug.steps.push('ERROR: ' + error.message)
    debug.error = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5),
      status: error.status,
    }
    return NextResponse.json(debug, { status: 500 })
  }
}
