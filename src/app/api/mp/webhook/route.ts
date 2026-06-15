import { NextRequest, NextResponse } from 'next/server'
import { initSchema, getUserById, activateUser } from '@/lib/academy-db'

export async function GET(request: NextRequest) {
  return handleWebhook(request)
}

export async function POST(request: NextRequest) {
  return handleWebhook(request)
}

async function handleWebhook(request: NextRequest) {
  try {
    await initSchema()

    const url = new URL(request.url)
    const topic = url.searchParams.get('topic')
    const type = url.searchParams.get('type')

    let paymentId: string | null = null

    // Handle payment notification
    if (topic === 'payment' || type === 'payment') {
      const body = await request.json().catch(() => ({}))
      paymentId = body.data?.id || body.id || url.searchParams.get('data.id')

      if (paymentId) {
        console.log(`[MP WEBHOOK] Payment notification received: ${paymentId}`)

        // Fetch payment details from MP API
        const mpAccessToken = process.env.MP_ACCESS_TOKEN
        if (mpAccessToken && mpAccessToken !== 'TEST-xxx') {
          try {
            const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
              headers: { 'Authorization': `Bearer ${mpAccessToken}` }
            })

            if (paymentResponse.ok) {
              const payment = await paymentResponse.json()
              const externalRef = payment.external_reference
              const status = payment.status

              console.log(`[MP WEBHOOK] Payment ${paymentId} status: ${status}, external_ref: ${externalRef}`)

              if (status === 'approved' && externalRef) {
                // Activate the user
                const user = await activateUser(externalRef, paymentId)
                if (user) {
                  console.log(`[MP WEBHOOK] User ${user.email} activated! Payment: ${paymentId}`)
                } else {
                  console.error(`[MP WEBHOOK] User not found for external_ref: ${externalRef}`)
                }
              }
            }
          } catch (fetchError) {
            console.error('[MP WEBHOOK] Error fetching payment details:', fetchError)
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[MP WEBHOOK] Error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}
