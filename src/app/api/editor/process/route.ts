import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import {
  initSchema,
  getUserById,
  getEditorUsageToday,
  recordEditorUsage,
  getEditorDailyLimit,
  EDITOR_DAILY_LIMIT_DEFAULT,
} from '@/lib/academy-db'
import ZAI from 'z-ai-web-dev-sdk'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ProcessBody {
  image: string // base64 data URL
  mode: 'enhance' | 'background' | 'outfit' | 'custom'
  prompt?: string
  background?: string // for background mode
  outfit?: string // for outfit mode
  size?: string
}

function buildPrompt(body: ProcessBody): string {
  switch (body.mode) {
    case 'enhance':
      return `Enhance photo quality significantly: sharpen details, improve lighting, color saturation and clarity, increase resolution to HD, professional photography quality. Remove noise, compression artifacts and pixelation. Keep the person's face, hair, body, pose, clothing and background EXACTLY the same. Only improve overall image quality with professional retouching, do not change composition, do not alter any element, only upscale and enhance.`

    case 'background':
      return `Replace the background with: ${body.background || 'a luxurious modern penthouse interior at golden hour sunset'}. Keep the person IDENTICAL: same face, same exact pose, same clothing, same hair, same skin tone, same lighting on the body. Only change the background. Professional photography quality.`

    case 'outfit':
      return `Replace the person's current outfit with: ${body.outfit || 'a glossy black latex catsuit, full body, long sleeves and legs, with realistic shine and reflections'}. The material should have realistic shine and reflections following the body curves. CRITICAL - Keep IDENTICAL: the person's face (same features, same expression, same makeup), the exact pose, the hair, the body shape and proportions, the background, the lighting. Only change the outfit. Professional photography, high detail, realistic material with proper highlights and reflections.`

    case 'custom':
      return body.prompt || 'Enhance this photo'

    default:
      return 'Enhance this photo'
  }
}

function pickSize(imageDataUrl: string): string {
  // Default to portrait 768x1344 (works for most OF photos)
  // Could be extended to detect aspect ratio from base64
  return '768x1344'
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
    }

    await initSchema()

    const user = await getUserById(payload.id)
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Check editor_access flag (admins always have access)
    if (user.role !== 'admin' && !user.editor_access) {
      return NextResponse.json(
        { error: 'No tenés acceso al editor. Contactate con soporte para activarlo.' },
        { status: 403 }
      )
    }

    // Check daily usage limit (admins bypass)
    const dailyLimit = await getEditorDailyLimit()
    if (user.role !== 'admin' && dailyLimit >= 0) {
      const usedToday = await getEditorUsageToday(user.id)
      if (usedToday >= dailyLimit) {
        return NextResponse.json(
          { error: `Alcanzaste el límite diario de ${dailyLimit} fotos. Volvé mañana.` },
          { status: 429 }
        )
      }
    }

    const body = (await request.json()) as ProcessBody

    if (!body.image || !body.image.startsWith('data:image/')) {
      return NextResponse.json({ error: 'Imagen requerida (data URL)' }, { status: 400 })
    }

    if (!body.mode || !['enhance', 'background', 'outfit', 'custom'].includes(body.mode)) {
      return NextResponse.json({ error: 'Modo inválido' }, { status: 400 })
    }

    const prompt = buildPrompt(body)
    const size = body.size || pickSize(body.image)

    // Validate image size — limit to 8MB
    const imageBytes = Math.ceil((body.image.length * 3) / 4)
    if (imageBytes > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen es muy grande (máx 8MB). Usá una más chica.' },
        { status: 413 }
      )
    }

    // Process with z-ai SDK
    const zai = await ZAI.create()
    const response = await zai.images.generations.edit({
      prompt,
      images: [{ url: body.image }],
      size,
    })

    const imageBase64 = response.data[0].base64

    // Record usage
    await recordEditorUsage(user.id, body.mode, prompt)

    const usedToday = await getEditorUsageToday(user.id)
    const isAdmin = user.role === 'admin'
    const remaining = dailyLimit < 0 ? '∞' : Math.max(0, dailyLimit - usedToday)

    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${imageBase64}`,
      usage: {
        usedToday: isAdmin ? 0 : usedToday,
        remaining: isAdmin ? '∞' : remaining,
        limit: isAdmin ? '∞' : (dailyLimit < 0 ? '∞' : dailyLimit),
      },
    })
  } catch (error: any) {
    console.error('Editor process error:', error)
    return NextResponse.json(
      { error: error?.message || 'Error al procesar la imagen' },
      { status: 500 }
    )
  }
}
