import { NextResponse } from 'next/server'
import { initSchema, getModulesWithLessons } from '@/lib/academy-db'

export async function GET() {
  try {
    await initSchema()
    const modules = await getModulesWithLessons()
    return NextResponse.json({ modules })
  } catch (error) {
    console.error('Modules GET error:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
