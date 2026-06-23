import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getUserById } from '@/lib/academy-db'
import { filterPrompt, ESTILOS_GENERADOR, type EstiloGenerador } from '@/lib/generador/filtro-prompts'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

async function initZAI() {
  const baseUrl = process.env.ZAI_BASE_URL
  const apiKey = process.env.ZAI_API_KEY

  if (baseUrl && apiKey) {
    const config = {
      baseUrl,
      apiKey,
      chatId: process.env.ZAI_CHAT_ID || '',
      userId: process.env.ZAI_USER_ID || '',
      token: process.env.ZAI_TOKEN || '',
    }
    try {
      // @ts-ignore
      return new ZAI(config)
    } catch (e: any) {
      console.error('[generador] new ZAI(config) falló, probando ZAI.create():', e.message)
    }
  }
  try {
    return await ZAI.create()
  } catch (e: any) {
    throw new Error(
      'No se pudo inicializar el SDK de IA. ' +
      'En producción: configurá ZAI_BASE_URL, ZAI_API_KEY, ZAI_CHAT_ID, ZAI_USER_ID, ZAI_TOKEN en Vercel. ' +
      `Error original: ${e.message}`
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Solo admin puede usar el generador
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado. Solo admin.' }, { status: 403 })
    }

    await initSchema()

    const body = await request.json()
    const { prompt, estilo } = body as { prompt: string; estilo: EstiloGenerador }

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 })
    }

    // Filtrar el prompt
    const { filtered, changes } = filterPrompt(prompt.trim())
    const estiloSuffix = ESTILOS_GENERADOR[estilo] || ESTILOS_GENERADOR.elegante
    const fullPrompt = `${filtered}, ${estiloSuffix}`

    console.log('[generador] Generando imagen. Prompt filtrado:', fullPrompt.substring(0, 100))

    // Generar imagen con IA
    const zai = await initZAI()
    const response = await zai.images.generations.create({
      prompt: fullPrompt,
      size: '768x1344',
    })

    const imageBase64 = response.data[0].base64

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${imageBase64}`,
      changes,
      prompt_filtrado: filtered,
    })
  } catch (error: any) {
    console.error('[generador] Error:', error)

    let errorMessage = error?.message || 'Error al procesar'
    let status = 500

    if (errorMessage.includes('Falta configurar') || errorMessage.includes('No se pudo inicializar')) {
      status = 503
      errorMessage = 'El generador de IA no está configurado. Avisale al administrador.'
    } else if (errorMessage.includes('API request failed')) {
      status = 502
      errorMessage = 'El servicio de IA no respondió. Probá de nuevo en unos segundos.'
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      status = 429
      errorMessage = 'Servicio saturado. Esperá 1 minuto y probá de nuevo.'
    }

    return NextResponse.json({ error: errorMessage }, { status })
  }
}
