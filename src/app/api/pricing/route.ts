import { NextResponse } from 'next/server'
import { getAllPricing } from '@/lib/academy-db'

export const dynamic = 'force-dynamic'

// GET /api/pricing — public, returns pricing for all courses
export async function GET() {
  try {
    const pricing = await getAllPricing()
    return NextResponse.json({ pricing })
  } catch (error) {
    console.error('[/api/pricing] error:', error)
    return NextResponse.json(
      { error: 'Error al obtener precios', pricing: [] },
      { status: 200 } // soft-fail so campus can still render
    )
  }
}
