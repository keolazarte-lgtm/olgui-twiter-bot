import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'
import { initSchema, toggleLessonProgress, getUserProgress } from '@/lib/academy-db'

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

    const { lessonId } = await request.json()
    if (!lessonId) {
      return NextResponse.json({ error: 'lessonId es requerido' }, { status: 400 })
    }

    await initSchema()
    await toggleLessonProgress(payload.id, lessonId)
    const progress = await getUserProgress(payload.id)

    return NextResponse.json({
      success: true,
      progress: progress.map(p => ({
        lessonId: p.lesson_id,
        completed: p.completed,
        completedAt: p.completed_at,
      }))
    })
  } catch (error) {
    console.error('Progress POST error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
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
    const progress = await getUserProgress(payload.id)

    return NextResponse.json({
      progress: progress.map(p => ({
        lessonId: p.lesson_id,
        completed: p.completed,
        completedAt: p.completed_at,
      }))
    })
  } catch (error) {
    console.error('Progress GET error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
