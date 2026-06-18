/**
 * Seed ALL 3 courses (Reddit, OnlyFans, Hombres) from extracted docx content.
 * Replaces the OnlyFans-only seedModules function with a complete one.
 *
 * Reads /home/z/my-project/scripts/course-content.json
 * Writes to: modules + lessons tables (with course field)
 */
import path from 'node:path'
import fs from 'fs'
import { config as loadEnv } from 'dotenv'
loadEnv({ path: path.resolve(__dirname, '..', '.env'), override: true })

import { getDb, initSchema } from '../src/lib/academy-db'

// ─── Course metadata ─────────────────────────────────────
const COURSE_META: Record<string, { icon: string; description: string }> = {
  reddit: {
    icon: 'Globe',
    description: 'Anatomía de Reddit, Karma, nichos y fetiches, manual de operaciones, horarios pico, RedGifs y lista oficial de 26 categorías de comunidades NSFW.',
  },
  onlyfans: {
    icon: 'Crown',
    description: 'Mentalidad, configuración de élite, panel de control, tarifas y estrategia de tráfico. Tu camino completo de cero a facturar en dólares.',
  },
  hombres: {
    icon: 'Users',
    description: 'Mentalidad del creador masculino, comunidad LGBTQ+ como mercado principal, privacidad, panel, tarifas y promoción en Reddit y Twitter (X).',
  },
}

// ─── Convert raw text → HTML ─────────────────────────────
function textToHtml(raw: string): string {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
  const html: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Skip empty
    if (!line) continue
    // Skip pure emoji lines
    if (/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\s]+$/u.test(line)) continue

    // Headings — short lines that look like titles
    const isAllCapsShort = line.length < 80 && line === line.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3,}/.test(line)
    const isNumberedHeading = /^\d+\.\s+[A-ZÁÉÍÓÚÑ]/.test(line) && line.length < 100
    const isPasoHeading = /^PASO\s+\d+/i.test(line) && line.length < 100
    const isSectionHeading = /^Sección\s+\d+/i.test(line) && line.length < 100
    const isAlertHeading = /ALERTA|REGLA DE ORO|⚠|🚨|💡|🔑|⚡|🆔|🤫|🎯|👑|📦|📖|📸|✍️|⏱️/.test(line) && line.length < 120

    if (isAllCapsShort && line.length < 60) {
      html.push(`<h3>${escapeHtml(line)}</h3>`)
    } else if (isNumberedHeading || isPasoHeading || isSectionHeading) {
      html.push(`<h4>${escapeHtml(line)}</h4>`)
    } else if (isAlertHeading) {
      html.push(`<h4 style="color:#fcd34d">⚡ ${escapeHtml(line)}</h4>`)
    } else {
      html.push(`<p>${escapeHtml(line)}</p>`)
    }
  }

  return html.join('\n')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// ─── Module icon assignment per course ────────────────────
const REDDIT_ICONS = ['Globe', 'Star', 'Palette', 'BookOpen', 'Clock', 'Sparkles', 'Flame', 'Shield']
const ONLYFANS_ICONS = ['Brain', 'Lock', 'Shield', 'DollarSign', 'UserCheck', 'Banknote', 'Flame']
const HOMBRES_ICONS = ['Users', 'Lock', 'Shield', 'DollarSign', 'UserCheck', 'Flame']

function getIcon(course: string, idx: number): string {
  if (course === 'reddit') return REDDIT_ICONS[idx % REDDIT_ICONS.length]
  if (course === 'hombres') return HOMBRES_ICONS[idx % HOMBRES_ICONS.length]
  return ONLYFANS_ICONS[idx % ONLYFANS_ICONS.length]
}

// ─── Main seed function ──────────────────────────────────
async function seedAllCourses() {
  const db = getDb()

  // Run schema migration first (adds course column if missing)
  console.log('Running schema init (adds course column if missing)...')
  await initSchema()
  console.log('✓ Schema ready')

  // Load JSON
  const jsonPath = path.resolve(__dirname, 'course-content.json')
  const raw = fs.readFileSync(jsonPath, 'utf-8')
  const courses = JSON.parse(raw) as Record<string, Array<{
    order_num: number
    title: string
    lessons: Array<{ title: string; content: string }>
  }>>

  // Wipe existing
  console.log('Cleaning existing modules + lessons...')
  await db.execute('DELETE FROM lessons')
  await db.execute('DELETE FROM modules')

  let moduleCount = 0
  let lessonCount = 0

  for (const courseKey of ['reddit', 'onlyfans', 'hombres']) {
    const courseModules = courses[courseKey]
    if (!courseModules || courseModules.length === 0) {
      console.log(`  ⚠ No modules for ${courseKey}, skipping`)
      continue
    }

    console.log(`\n📚 ${courseKey.toUpperCase()} — ${courseModules.length} modules`)
    const meta = COURSE_META[courseKey]

    // Sort modules by order_num
    const sorted = [...courseModules].sort((a, b) => a.order_num - b.order_num)

    // Dedupe by order_num — keep the LAST occurrence (newest version in docx)
    const deduped: typeof sorted = []
    const seenOrders = new Set<number>()
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (!seenOrders.has(sorted[i].order_num)) {
        deduped.unshift(sorted[i])
        seenOrders.add(sorted[i].order_num)
      }
    }
    const finalModules = deduped.sort((a, b) => a.order_num - b.order_num)

    finalModules.forEach((mod, modIdx) => {
      const moduleId = `${courseKey}-mod-${mod.order_num}`
      const cleanTitle = mod.title
        .replace(/^M[ÓO]DULO\s*\d+\s*:\s*/i, '')
        .replace(/^Modulo\s*\d+\s*/i, '')
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .trim()
      const icon = getIcon(courseKey, modIdx)

      // Insert module
      db.execute({
        sql: `INSERT INTO modules (id, title, description, order_num, icon, course)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [
          moduleId,
          cleanTitle,
          meta.description,
          mod.order_num,
          icon,
          courseKey,
        ],
      }).then(() => {
        moduleCount++
        console.log(`  ✓ M${mod.order_num}: ${cleanTitle.substring(0, 50)} [${icon}]`)
      }).catch(e => {
        console.error(`  ✗ Failed to insert ${moduleId}:`, e.message)
      })

      // Insert lessons for this module
      mod.lessons.forEach((lesson, lesIdx) => {
        const lessonId = `${courseKey}-les-${mod.order_num}-${lesIdx + 1}`
        const cleanLessonTitle = lesson.title
          .replace(/^Sección\s+\d+\s*:\s*/i, '')
          .replace(/^PASO\s+\d+\s*:\s*/i, '')
          .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
          .trim()
        const html = textToHtml(lesson.content)

        db.execute({
          sql: `INSERT INTO lessons (id, module_id, title, content_type, content, order_num)
                VALUES (?, ?, ?, 'text', ?, ?)`,
          args: [lessonId, moduleId, cleanLessonTitle, html, lesIdx + 1],
        }).then(() => {
          lessonCount++
        }).catch(e => {
          console.error(`  ✗ Failed to insert lesson ${lessonId}:`, e.message)
        })
      })
    })

    // Wait for inserts to complete for this course
    await new Promise(r => setTimeout(r, 500))
  }

  // Final wait
  await new Promise(r => setTimeout(r, 1000))

  // Verify
  const modCount = await db.execute('SELECT COUNT(*) as c FROM modules')
  const lesCount = await db.execute('SELECT COUNT(*) as c FROM lessons')
  console.log(`\n═══ FINAL COUNT ═══`)
  console.log(`  Modules: ${modCount.rows[0].c}`)
  console.log(`  Lessons: ${lesCount.rows[0].c}`)

  // By course
  const dist = await db.execute('SELECT course, COUNT(*) as c FROM modules GROUP BY course')
  console.log(`\n  Modules per course:`)
  for (const r of dist.rows) {
    console.log(`    ${r.course}: ${r.c} modules`)
  }
}

seedAllCourses().catch(e => {
  console.error(e)
  process.exit(1)
})
