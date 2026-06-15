import { NextResponse } from 'next/server'
import { initSchema, seedModules, seedAdmin } from '@/lib/academy-db'

export async function POST() {
  try {
    await initSchema()
    const modulesResult = await seedModules()
    const adminResult = await seedAdmin()

    return NextResponse.json({
      success: true,
      message: 'Base de datos inicializada correctamente',
      modules: modulesResult,
      admin: adminResult,
    })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Error al inicializar la base de datos' }, { status: 500 })
  }
}
