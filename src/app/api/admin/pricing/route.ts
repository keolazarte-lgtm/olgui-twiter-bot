import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getAllPricing, updatePricing } from '@/lib/academy-db'

export const dynamic = 'force-dynamic'

// GET /api/admin/pricing — list all course pricing (admin only)
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    await initSchema()
    const pricing = await getAllPricing()
    return NextResponse.json({ pricing })
  } catch (error) {
    console.error('[/api/admin/pricing GET] error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

// POST /api/admin/pricing — update one course pricing (admin only)
// Body: { course: string, arsAmount?, arsStrike?, usdAmount?, usdStrike?, mpLink?, binanceId?, binanceInstructions?, isFeatured?, badgeText? }
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('da_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const { course } = body
    if (!course || !['onlyfans', 'hombres', 'reddit'].includes(course)) {
      return NextResponse.json({ error: 'Curso inválido' }, { status: 400 })
    }

    await initSchema()
    const updated = await updatePricing(course, {
      arsAmount: body.arsAmount !== undefined ? Number(body.arsAmount) : undefined,
      arsStrike: body.arsStrike !== undefined ? (body.arsStrike === null || body.arsStrike === '' ? null : Number(body.arsStrike)) : undefined,
      usdAmount: body.usdAmount !== undefined ? Number(body.usdAmount) : undefined,
      usdStrike: body.usdStrike !== undefined ? (body.usdStrike === null || body.usdStrike === '' ? null : Number(body.usdStrike)) : undefined,
      mpLink: body.mpLink !== undefined ? (body.mpLink || null) : undefined,
      binanceId: body.binanceId !== undefined ? (body.binanceId || null) : undefined,
      binanceInstructions: body.binanceInstructions !== undefined ? (body.binanceInstructions || null) : undefined,
      isFeatured: body.isFeatured !== undefined ? Boolean(body.isFeatured) : undefined,
      badgeText: body.badgeText !== undefined ? (body.badgeText || null) : undefined,
    })

    return NextResponse.json({ success: true, pricing: updated })
  } catch (error) {
    console.error('[/api/admin/pricing POST] error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
