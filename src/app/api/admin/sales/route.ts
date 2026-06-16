import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getAllSales, getSalesStats } from '@/lib/academy-db'

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

    const [sales, stats] = await Promise.all([
      getAllSales(),
      getSalesStats(),
    ])

    return NextResponse.json({
      sales: sales.map(s => ({
        id: s.id,
        userId: s.user_id,
        userEmail: s.user_email,
        userName: s.user_name,
        amount: s.amount,
        currency: s.currency,
        mpPaymentId: s.mp_payment_id,
        status: s.status,
        createdAt: s.created_at,
      })),
      stats,
    })
  } catch (error) {
    console.error('Admin sales error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
