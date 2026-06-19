/**
 * Verifica el estado real de la DB: schema de modules y qué cursos hay
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: path.resolve(__dirname, '..', '.env'), override: true })

import { getDb, getAllPricing } from '../src/lib/academy-db'

async function main() {
  const db = getDb()

  // Check modules table schema
  console.log('═══ MODULES TABLE SCHEMA ═══')
  try {
    const schema = await db.execute("PRAGMA table_info(modules)")
    for (const col of schema.rows) {
      console.log(`  ${col.name} (${col.type})`)
    }
  } catch (e) {
    console.log('  Error:', e)
  }

  // Check modules count
  console.log('\n═══ MODULES COUNT ═══')
  const mods = await db.execute('SELECT COUNT(*) as count FROM modules')
  console.log(`  Total modules: ${mods.rows[0].count}`)

  // Check if course column exists
  const schema = await db.execute("PRAGMA table_info(modules)")
  const hasCourseCol = schema.rows.some((c: any) => c.name === 'course')
  console.log(`  Has 'course' column: ${hasCourseCol}`)

  // If course column exists, show distribution
  if (hasCourseCol) {
    const dist = await db.execute('SELECT course, COUNT(*) as count FROM modules GROUP BY course')
    console.log('\n═══ MODULES BY COURSE ═══')
    for (const r of dist.rows) {
      console.log(`  ${r.course}: ${r.count} módulos`)
    }
  }

  // Pricing
  console.log('\n═══ COURSE PRICING ═══')
  const pricing = await getAllPricing()
  for (const p of pricing) {
    console.log(`  ${p.course}: $${p.arsAmount} ARS / $${p.usdAmount} USD${p.isFeatured ? ' ⭐ FEATURED' : ''}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
