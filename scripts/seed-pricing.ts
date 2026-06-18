/**
 * Verifica y siembra la tabla course_pricing en Turso
 */
import path from 'node:path'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: path.resolve(__dirname, '..', '.env'), override: true })

import { initSchema, getAllPricing } from '../src/lib/academy-db'

async function main() {
  console.log('Inicializando schema (crea tabla course_pricing si no existe)...')
  await initSchema()
  console.log('✓ Schema OK')

  const pricing = await getAllPricing()
  console.log(`\n✓ ${pricing.length} cursos con pricing:`)
  for (const p of pricing) {
    console.log(`  ${p.course}: $${p.arsAmount} ARS / $${p.usdAmount} USD${p.isFeatured ? ' ⭐ FEATURED' : ''} (badge: ${p.badgeText || '—'})`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
