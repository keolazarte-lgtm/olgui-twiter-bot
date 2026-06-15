import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, getUserById } from '@/lib/academy-db'

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

    // Create MercadoPago preference
    const mpAccessToken = process.env.MP_ACCESS_TOKEN
    if (!mpAccessToken || mpAccessToken === 'TEST-xxx') {
      // Fallback to static link if no MP token configured
      return NextResponse.json({
        preferenceId: 'fallback',
        initPoint: 'https://mpago.la/1YyoEXn',
        fallback: true,
      })
    }

    const userId = user.id as string
    const userEmail = user.email as string

    const preferenceData = {
      items: [
        {
          title: 'Dinasty Academy — Manual Completo + Campus Exclusivo',
          description: 'Módulo 1: Configuración de Élite y Privacidad Total. 6 módulos de configuración de élite para OnlyFans.',
          quantity: 1,
          unit_price: 15000,
          currency_id: 'ARS',
        }
      ],
      payer: {
        email: userEmail,
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/campus`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/campus/pending`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL || ''}/campus/pending`,
      },
      notification_url: process.env.MP_WEBHOOK_URL || undefined,
      external_reference: userId,
      metadata: {
        user_id: userId,
        user_email: userEmail,
      }
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferenceData),
    })

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      console.error('MP API error:', errorText)
      // Fallback to static link
      return NextResponse.json({
        preferenceId: 'fallback',
        initPoint: 'https://mpago.la/1YyoEXn',
        fallback: true,
      })
    }

    const preference = await mpResponse.json()

    return NextResponse.json({
      preferenceId: preference.id,
      initPoint: preference.init_point,
      sandboxInitPoint: preference.sandbox_init_point,
    })
  } catch (error) {
    console.error('Create preference error:', error)
    return NextResponse.json({ error: 'Error al crear preferencia de pago' }, { status: 500 })
  }
}
