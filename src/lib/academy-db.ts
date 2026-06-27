/**
 * Dinasty Academy - Database helpers
 * Uses @libsql/client directly for the campus tables.
 * Supports both Turso (cloud) and local SQLite.
 */

import { createClient, type Client } from '@libsql/client'
import path from 'path'

let academyClient: Client | null = null

export function getDb(): Client {
  if (!academyClient) {
    const url = process.env.DATABASE_URL || ''
    const token = process.env.TURSO_AUTH_TOKEN || ''

    if (url.startsWith('libsql://')) {
      academyClient = createClient({ url, authToken: token })
    } else {
      // Fallback to local SQLite file
      const dbPath = path.join(process.cwd(), 'db', 'academy.db')
      academyClient = createClient({ url: `file:${dbPath}` })
    }
  }
  return academyClient
}

// ─── Schema Init ──────────────────────────────────────────

export async function initSchema() {
  const db = getDb()

  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      phone TEXT,
      role TEXT DEFAULT 'student',
      active INTEGER DEFAULT 0,
      editor_access INTEGER DEFAULT 0,
      mp_payment_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Migration: add editor_access column if missing (existing DBs)
  try {
    const userCols = await db.execute("PRAGMA table_info(users)")
    const hasEditorAccess = userCols.rows.some((c: any) => c.name === 'editor_access')
    if (!hasEditorAccess) {
      await db.execute("ALTER TABLE users ADD COLUMN editor_access INTEGER DEFAULT 0")
      console.log('✓ Added editor_access column to users table')
    }
  } catch (e) {
    // ignore
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      order_num INTEGER,
      icon TEXT,
      course TEXT DEFAULT 'onlyfans',
      is_alert INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Migration: add `course` column if missing (existing DBs)
  try {
    const cols = await db.execute("PRAGMA table_info(modules)")
    const hasCourse = cols.rows.some((c: any) => c.name === 'course')
    if (!hasCourse) {
      await db.execute("ALTER TABLE modules ADD COLUMN course TEXT DEFAULT 'onlyfans'")
      console.log('✓ Added course column to modules table')
    }
    const hasAlert = cols.rows.some((c: any) => c.name === 'is_alert')
    if (!hasAlert) {
      await db.execute("ALTER TABLE modules ADD COLUMN is_alert INTEGER DEFAULT 0")
      console.log('✓ Added is_alert column to modules table')
    }
  } catch (e) {
    // ignore — column might already exist
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content_type TEXT DEFAULT 'text',
      content TEXT,
      order_num INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (module_id) REFERENCES modules(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      PRIMARY KEY (user_id, lesson_id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (lesson_id) REFERENCES lessons(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_email TEXT NOT NULL,
      user_name TEXT,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'ARS',
      mp_payment_id TEXT,
      status TEXT DEFAULT 'approved',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      ip TEXT,
      user_agent TEXT,
      path TEXT NOT NULL,
      referer TEXT,
      method TEXT,
      country TEXT,
      city TEXT,
      device TEXT,
      browser TEXT,
      is_bot INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Index for faster queries on common filters
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_visits_created_at ON visits(created_at DESC)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_visits_path ON visits(path)
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_visits_ip ON visits(ip)
  `)

  // Editor de fotos con IA — registro de uso por usuaria (para límite diario)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS editor_usage (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      prompt TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_editor_usage_user_date ON editor_usage(user_id, created_at DESC)
  `)

  // Acceso a cursos por usuaria (1 fila por usuario+curso)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_courses (
      user_id TEXT NOT NULL,
      course TEXT NOT NULL,
      active INTEGER DEFAULT 0,
      purchased_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, course),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_user_courses_user ON user_courses(user_id)
  `)

  // Config global del editor (limite diario, etc.)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS editor_config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)
  // Seed default limit = 20
  await db.execute(`
    INSERT OR IGNORE INTO editor_config (key, value) VALUES ('daily_limit', '20')
  `)

  // Course pricing — one row per course (onlyfans, hombres, reddit)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS course_pricing (
      course TEXT PRIMARY KEY,
      ars_amount REAL NOT NULL DEFAULT 15000,
      ars_strike REAL,
      usd_amount REAL NOT NULL DEFAULT 25,
      usd_strike REAL,
      mp_link TEXT,
      binance_id TEXT,
      binance_instructions TEXT,
      is_featured INTEGER DEFAULT 0,
      badge_text TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Seed default pricing for the 3 courses if not exists
  await seedDefaultPricing()
}

// ─── User Helpers ─────────────────────────────────────────

export async function createUser(data: {
  email: string
  passwordHash: string
  name?: string
  phone?: string
  role?: string
  active?: number
}) {
  const db = getDb()
  const id = crypto.randomUUID()
  await db.execute({
    sql: `INSERT INTO users (id, email, password_hash, name, phone, role, active)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.email, data.passwordHash, data.name || null, data.phone || null, data.role || 'student', data.active ?? 0]
  })
  return getUserById(id)
}

export async function getUserByEmail(email: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email]
  })
  return result.rows[0] || null
}

export async function getUserById(id: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM users WHERE id = ?',
    args: [id]
  })
  return result.rows[0] || null
}

export async function activateUser(userId: string, mpPaymentId?: string) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET active = 1, mp_payment_id = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [mpPaymentId || null, userId]
  })

  // Also record the sale
  const user = await getUserById(userId)
  if (user) {
    await recordSale({
      userId,
      userEmail: user.email as string,
      userName: user.name as string | null,
      amount: 15000,
      currency: 'ARS',
      mpPaymentId: mpPaymentId || null,
      status: 'approved',
    })
  }

  return getUserById(userId)
}

export async function toggleUserActive(userId: string, active: number) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET active = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [active, userId]
  })
  return getUserById(userId)
}

export async function toggleUserEditorAccess(userId: string, editorAccess: number) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET editor_access = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [editorAccess, userId]
  })
  return getUserById(userId)
}

export async function setUserRole(userId: string, role: string) {
  const db = getDb()
  await db.execute({
    sql: `UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [role, userId]
  })
  return getUserById(userId)
}

// ─── Course Access Helpers ──────────────────────────────────

export const VALID_COURSES = ['onlyfans', 'reddit', 'hombres', 'fetiches'] as const
export type CourseId = typeof VALID_COURSES[number]

/**
 * Devuelve los cursos activos de un usuario: { onlyfans: bool, reddit: bool, hombres: bool, fetiches: bool }
 * Si el usuario tiene active=1 (legacy) Y NO tiene filas en user_courses, se le da acceso a todos (migración implícita)
 */
export async function getUserCourseAccess(userId: string): Promise<{ onlyfans: boolean; reddit: boolean; hombres: boolean; fetiches: boolean }> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT course, active FROM user_courses WHERE user_id = ?`,
    args: [userId]
  })

  const access: { onlyfans: boolean; reddit: boolean; hombres: boolean; fetiches: boolean } = {
    onlyfans: false,
    reddit: false,
    hombres: false,
    fetiches: false,
  }

  if (result.rows.length === 0) {
    // Legacy: si no tiene filas en user_courses pero tiene users.active = 1, darle todo
    const user = await getUserById(userId)
    if (user && (user as any).active === 1) {
      access.onlyfans = true
      access.reddit = true
      access.hombres = true
      access.fetiches = true
    }
    return access
  }

  for (const row of result.rows) {
    const course = (row as any).course as string
    const active = Number((row as any).active)
    if (course in access) {
      (access as any)[course] = active === 1
    }
  }
  return access
}

/**
 * Activa o desactiva un curso específico para un usuario.
 * Si no existe la fila, la crea.
 */
export async function setUserCourseAccess(userId: string, course: string, active: boolean) {
  const db = getDb()
  const activeNum = active ? 1 : 0
  await db.execute({
    sql: `INSERT INTO user_courses (user_id, course, active, purchased_at)
          VALUES (?, ?, ?, datetime('now'))
          ON CONFLICT(user_id, course) DO UPDATE SET active = excluded.active, purchased_at = datetime('now')`,
    args: [userId, course, activeNum]
  })
  return getUserCourseAccess(userId)
}

/**
 * Devuelve un resumen de los cursos de cada usuario (para el admin dashboard).
 * Incluye migración implícita (legacy active=1 = todos los cursos).
 */
export async function getAllUsersWithCourses() {
  const db = getDb()
  const users = await db.execute('SELECT * FROM users ORDER BY created_at DESC')
  const courses = await db.execute('SELECT * FROM user_courses')

  return users.rows.map(u => {
    const userCourses = courses.rows.filter(c => (c as any).user_id === (u as any).id)
    const hasExplicitCourses = userCourses.length > 0
    const isLegacyActive = (u as any).active === 1

    let access = { onlyfans: false, reddit: false, hombres: false, fetiches: false }
    if (hasExplicitCourses) {
      for (const c of userCourses) {
        const course = (c as any).course as string
        const active = Number((c as any).active) === 1
        if (course in access) (access as any)[course] = active
      }
    } else if (isLegacyActive) {
      // Legacy: usuario con active=1 pero sin cursos explícitos → acceso a todo
      access = { onlyfans: true, reddit: true, hombres: true, fetiches: true }
    }

    return {
      id: (u as any).id,
      email: (u as any).email,
      name: (u as any).name,
      phone: (u as any).phone,
      role: (u as any).role,
      active: (u as any).active,
      editorAccess: Boolean((u as any).editor_access),
      mpPaymentId: (u as any).mp_payment_id,
      createdAt: (u as any).created_at,
      courseAccess: access,
      isLegacy: !hasExplicitCourses && isLegacyActive,
    }
  })
}

export async function getAllUsers() {
  const db = getDb()
  const result = await db.execute('SELECT * FROM users ORDER BY created_at DESC')
  return result.rows
}

export async function deleteUser(userId: string) {
  const db = getDb()
  // Borrar en cascada los datos relacionados
  await db.execute({
    sql: `DELETE FROM user_progress WHERE user_id = ?`,
    args: [userId]
  })
  await db.execute({
    sql: `DELETE FROM user_courses WHERE user_id = ?`,
    args: [userId]
  })
  await db.execute({
    sql: `DELETE FROM editor_usage WHERE user_id = ?`,
    args: [userId]
  })
  await db.execute({
    sql: `DELETE FROM sales WHERE user_id = ?`,
    args: [userId]
  })
  // Finalmente borrar el usuario
  await db.execute({
    sql: `DELETE FROM users WHERE id = ?`,
    args: [userId]
  })
  return { success: true, id: userId }
}

// ─── Module & Lesson Helpers ──────────────────────────────

export async function getModulesWithLessons() {
  const db = getDb()
  const modules = await db.execute('SELECT * FROM modules ORDER BY order_num ASC')
  const lessons = await db.execute('SELECT * FROM lessons ORDER BY order_num ASC')

  return modules.rows.map(m => ({
    id: m.id as string,
    title: m.title as string,
    description: m.description as string | null,
    orderNum: m.order_num as number,
    icon: m.icon as string | null,
    course: (m.course as string) || 'onlyfans',
    isAlert: Boolean(m.is_alert),
    createdAt: m.created_at as string,
    lessons: lessons.rows
      .filter(l => l.module_id === m.id)
      .map(l => ({
        id: l.id as string,
        moduleId: l.module_id as string,
        title: l.title as string,
        contentType: l.content_type as string,
        content: l.content as string | null,
        orderNum: l.order_num as number,
        createdAt: l.created_at as string,
      }))
  }))
}

export async function getModuleById(id: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM modules WHERE id = ?',
    args: [id]
  })
  return result.rows[0] || null
}

export async function getLessonsByModule(moduleId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM lessons WHERE module_id = ? ORDER BY order_num ASC',
    args: [moduleId]
  })
  return result.rows
}

export async function getLessonById(id: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM lessons WHERE id = ?',
    args: [id]
  })
  return result.rows[0] || null
}

// ─── Progress Helpers ─────────────────────────────────────

export async function getUserProgress(userId: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ?',
    args: [userId]
  })
  return result.rows
}

export async function toggleLessonProgress(userId: string, lessonId: string) {
  const db = getDb()
  const existing = await db.execute({
    sql: 'SELECT * FROM user_progress WHERE user_id = ? AND lesson_id = ?',
    args: [userId, lessonId]
  })

  if (existing.rows.length > 0) {
    const current = existing.rows[0].completed as number
    const newVal = current ? 0 : 1
    await db.execute({
      sql: `UPDATE user_progress SET completed = ?, completed_at = ? WHERE user_id = ? AND lesson_id = ?`,
      args: [newVal, newVal ? new Date().toISOString() : null, userId, lessonId]
    })
  } else {
    await db.execute({
      sql: `INSERT INTO user_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, ?)`,
      args: [userId, lessonId, new Date().toISOString()]
    })
  }

  return getUserProgress(userId)
}

// ─── Sales Helpers ────────────────────────────────────────

export async function recordSale(data: {
  userId: string
  userEmail: string
  userName: string | null
  amount: number
  currency: string
  mpPaymentId: string | null
  status: string
}) {
  const db = getDb()
  const id = crypto.randomUUID()
  await db.execute({
    sql: `INSERT INTO sales (id, user_id, user_email, user_name, amount, currency, mp_payment_id, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [id, data.userId, data.userEmail, data.userName, data.amount, data.currency, data.mpPaymentId, data.status]
  })
  return getSaleById(id)
}

export async function getSaleById(id: string) {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM sales WHERE id = ?',
    args: [id]
  })
  return result.rows[0] || null
}

export async function getAllSales() {
  const db = getDb()
  const result = await db.execute('SELECT * FROM sales ORDER BY created_at DESC')
  return result.rows
}

export async function getSalesStats() {
  const db = getDb()
  const totalResult = await db.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM sales WHERE status = \'approved\'')
  const todayResult = await db.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM sales WHERE status = \'approved\' AND date(created_at) = date(\'now\')')
  const monthResult = await db.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM sales WHERE status = \'approved\' AND strftime(\'%Y-%m\', created_at) = strftime(\'%Y-%m\', \'now\')')
  const weekResult = await db.execute('SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM sales WHERE status = \'approved\' AND created_at >= datetime(\'now\', \'-7 days\')')

  return {
    total: { count: totalResult.rows[0].count as number, amount: totalResult.rows[0].total as number },
    today: { count: todayResult.rows[0].count as number, amount: todayResult.rows[0].total as number },
    thisWeek: { count: weekResult.rows[0].count as number, amount: weekResult.rows[0].total as number },
    thisMonth: { count: monthResult.rows[0].count as number, amount: monthResult.rows[0].total as number },
  }
}

// ─── Visit Helpers ────────────────────────────────────────

export async function recordVisit(data: {
  ip: string | null
  userAgent: string | null
  path: string
  referer: string | null
  method: string
  country?: string | null
  city?: string | null
  device?: string | null
  browser?: string | null
  isBot?: boolean
}) {
  const db = getDb()
  const id = crypto.randomUUID()

  // Detect bot from user-agent
  const ua = data.userAgent || ''
  const isBot = data.isBot ?? /bot|crawler|spider|crawling|slurp|googlebot|bingbot|yandex|facebookexternalhit|twitterbot|linkedinbot|telegrambot|whatsapp|preview/i.test(ua)

  // Detect device type
  let device = data.device || 'desktop'
  if (!data.device) {
    if (/Mobile|Android|iPhone|iPod/.test(ua)) device = 'mobile'
    else if (/iPad|Tablet/.test(ua)) device = 'tablet'
  }

  // Detect browser
  let browser = data.browser || 'other'
  if (!data.browser) {
    if (/Edg\//.test(ua)) browser = 'edge'
    else if (/Chrome\//.test(ua)) browser = 'chrome'
    else if (/Firefox\//.test(ua)) browser = 'firefox'
    else if (/Safari\//.test(ua)) browser = 'safari'
  }

  try {
    await db.execute({
      sql: `INSERT INTO visits (id, ip, user_agent, path, referer, method, country, city, device, browser, is_bot)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        data.ip,
        data.userAgent,
        data.path,
        data.referer,
        data.method,
        data.country || null,
        data.city || null,
        device,
        browser,
        isBot ? 1 : 0,
      ],
    })
  } catch (e) {
    // ignore — visits are best-effort, never fail the request
  }
}

export interface VisitStats {
  total: number
  today: number
  thisWeek: number
  thisMonth: number
  uniqueIps: number
  bots: number
  byDevice: { device: string; count: number }[]
  byBrowser: { browser: string; count: number }[]
  byPath: { path: string; count: number }[]
  last7Days: { date: string; count: number }[]
}

export async function getVisitStats(): Promise<VisitStats> {
  const db = getDb()

  const [totalRes, todayRes, weekRes, monthRes, uniqueRes, botsRes, deviceRes, browserRes, pathRes, dailyRes] = await Promise.all([
    db.execute('SELECT COUNT(*) as c FROM visits'),
    db.execute(`SELECT COUNT(*) as c FROM visits WHERE date(created_at) = date('now')`),
    db.execute(`SELECT COUNT(*) as c FROM visits WHERE created_at >= datetime('now', '-7 days')`),
    db.execute(`SELECT COUNT(*) as c FROM visits WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`),
    db.execute(`SELECT COUNT(DISTINCT ip) as c FROM visits WHERE ip IS NOT NULL`),
    db.execute(`SELECT COUNT(*) as c FROM visits WHERE is_bot = 1`),
    db.execute(`SELECT device, COUNT(*) as c FROM visits GROUP BY device ORDER BY c DESC`),
    db.execute(`SELECT browser, COUNT(*) as c FROM visits GROUP BY browser ORDER BY c DESC`),
    db.execute(`SELECT path, COUNT(*) as c FROM visits GROUP BY path ORDER BY c DESC LIMIT 10`),
    db.execute(`
      SELECT date(created_at) as d, COUNT(*) as c
      FROM visits
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY date(created_at)
      ORDER BY d ASC
    `),
  ])

  return {
    total: totalRes.rows[0].c as number,
    today: todayRes.rows[0].c as number,
    thisWeek: weekRes.rows[0].c as number,
    thisMonth: monthRes.rows[0].c as number,
    uniqueIps: uniqueRes.rows[0].c as number,
    bots: botsRes.rows[0].c as number,
    byDevice: deviceRes.rows.map(r => ({ device: r.device as string, count: r.c as number })),
    byBrowser: browserRes.rows.map(r => ({ browser: r.browser as string, count: r.c as number })),
    byPath: pathRes.rows.map(r => ({ path: r.path as string, count: r.c as number })),
    last7Days: dailyRes.rows.map(r => ({ date: r.d as string, count: r.c as number })),
  }
}

export interface VisitItem {
  id: string
  ip: string | null
  userAgent: string | null
  path: string
  referer: string | null
  method: string
  country: string | null
  city: string | null
  device: string
  browser: string
  isBot: number
  createdAt: string
}

export async function getRecentVisits(limit = 50): Promise<VisitItem[]> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT * FROM visits ORDER BY created_at DESC LIMIT ?`,
    args: [limit],
  })
  return result.rows.map(r => ({
    id: r.id as string,
    ip: r.ip as string | null,
    userAgent: r.user_agent as string | null,
    path: r.path as string,
    referer: r.referer as string | null,
    method: r.method as string,
    country: r.country as string | null,
    city: r.city as string | null,
    device: r.device as string,
    browser: r.browser as string,
    isBot: r.is_bot as number,
    createdAt: r.created_at as string,
  }))
}

// ─── Seed Helpers ─────────────────────────────────────────

export async function seedModules() {
  const db = getDb()

  // Delete existing modules and lessons to re-seed with updated content
  await db.execute('DELETE FROM lessons')
  await db.execute('DELETE FROM modules')

  const modules = [
    { id: 'mod-1', title: 'Mentalidad, Preparación y Legado', description: 'De mujer a mujer: cómo superar los miedos, protegerte y construir tu imperio desde cero. Con o sin rostro.', order_num: 1, icon: 'Brain', is_alert: 0, course: 'onlyfans' },
    { id: 'mod-alerta-of', title: 'ALERTA ROJA: Reglas de OnlyFans y Cuidado de tu Cuenta', description: 'El mayor error de un creador novato es no leer los términos y condiciones. OnlyFans no da segundas oportunidades: leé esto ANTES de seguir.', order_num: 2, icon: 'AlertTriangle', is_alert: 1, course: 'onlyfans' },
    { id: 'mod-2', title: 'De Cero a Creadora: Creación y Verificación', description: 'Creá tu cuenta de OnlyFans paso a paso, activá el modo creadora y verificá tu identidad sin errores ni rechazos.', order_num: 3, icon: 'Lock', is_alert: 0, course: 'onlyfans' },
    { id: 'mod-3', title: 'El Panel de Control: Tu Centro de Mandos', description: 'Tus primeros ajustes, el menú desplegable completo y la sección especial de retiro de dinero. Cómo cobrar tus dólares.', order_num: 4, icon: 'Shield', is_alert: 0, course: 'onlyfans' },
    { id: 'mod-4', title: 'La Barra de Herramientas', description: 'Todos los íconos y funciones para armar tus publicaciones de forma profesional. Imágenes, videos, encuestas y más.', order_num: 5, icon: 'DollarSign', is_alert: 0, course: 'onlyfans' },
    { id: 'mod-5', title: 'Perfil e Identidad de Alto Valor', description: 'Nombre artístico, foto de perfil, portada, biografía, cuenta gratis y mensaje de bienvenida automatizado.', order_num: 6, icon: 'UserCheck', is_alert: 0, course: 'onlyfans' },
    { id: 'mod-6', title: 'Guía de Tarifas', description: 'Estrategia de venta dinámica — Tarifas de bóveda, contenido personalizado y servicios en tiempo real.', order_num: 7, icon: 'Banknote', is_alert: 0, course: 'onlyfans' },
    { id: 'mod-7', title: 'Cómo obtener tus primeros suscriptores', description: 'Promoción cruzada, redes de tráfico orgánico y estrategias para arrancar con ventas desde el día uno.', order_num: 8, icon: 'Flame', is_alert: 0, course: 'onlyfans' },

    // ─── CURSO DE FETICHES (curso aparte) ───
    { id: 'mod-fet-1', title: 'Bienvenida al Curso de Fetiches', description: 'Si estás leyendo este manual, es porque tomaste la decisión de dejar de competir por centavos en el mercado masivo y decides entender cómo funciona la...', order_num: 1, icon: 'Sparkles', course: 'fetiches', is_alert: 0 },
    { id: 'mod-fet-2', title: 'Psicología del Fetiche y Mentalidad de Negocio', description: 'El error más común de una creadora es querer gustarle a todo el mundo. Creen que publicando contenido genérico o masivo van a atraer a más clientes. S...', order_num: 2, icon: 'Brain', course: 'fetiches', is_alert: 0 },
    { id: 'mod-fet-3', title: 'Anatomía del Deseo (Investigación de Nichos)', description: 'A diferencia de lo que la mayoría de las creadoras principiantes cree, el cliente de SPH no busca una agresión real que lo destruya emocionalmente. Lo...', order_num: 3, icon: 'Globe', course: 'fetiches', is_alert: 0 },
    { id: 'mod-fet-4', title: 'Monetización en el Privado: El Arte de Cerrar Ventas Premium', description: 'Olvidate de exigir un tributo obligatorio solo para que el cliente pueda abrir el chat; en el día a día de las plataformas, eso no funciona y congela ...', order_num: 4, icon: 'DollarSign', course: 'fetiches', is_alert: 0 },
  ]

  for (const m of modules) {
    await db.execute({
      sql: `INSERT INTO modules (id, title, description, order_num, icon, is_alert, course) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [m.id, m.title, m.description, m.order_num, m.icon, m.is_alert, m.course]
    })
  }

  const lessonsData: { id: string; moduleId: string; title: string; content: string; orderNum: number; contentType: string }[] = [
    // ─── Module 1: Mentalidad, Preparación y Legado ───
    {
      id: 'les-1-1',
      moduleId: 'mod-1',
      title: 'El Espejo de la Emperatriz (Mi Historia)',
      content: `<h2>Si estás leyendo estas páginas, quiero que te detengas un segundo.</h2>
<p>Olvidate de las pantallas, de las redes y del ruido exterior. Quiero hablarte de mujer a mujer, de madre a madre, de emprendedora a emprendedora.</p>
<p>Hoy me conocés como Emperatriz, la mentora detrás de Dinastía Academy. Manejo mi propio negocio digital, tomo mis propias decisiones y soy la dueña absoluta de mi tiempo y de mis ingresos. Pero mi Imperio no se construyó en un día, y mucho menos nació desde la comodidad.</p>

<h3>El motor del cambio</h3>
<p>Tengo 49 años y tres hijos. Hace un tiempo, me encontré en una encrucijada que seguro conocés muy bien: la necesidad urgente de generar ingresos, de progresar, pero con la condición innegociable de necesitar un trabajo en casa. Quería estar para mis hijos, quería manejar mis horarios y no depender de un jefe ni de un empleo tradicional que me consumiera la vida a cambio de un sueldo básico.</p>
<p>Fue ahí cuando decidí dar el paso hacia la creación de contenido premium. Pero te mentiría si te dijera que no tuve dudas. Al contrario, estaba llena de ellas.</p>

<h3>Los fantasmas: La edad, el cuerpo y el miedo al "qué dirán"</h3>
<p>Cuando decidí dedicarme al 100% a esto, aparecieron todos los miedos juntos. Me miraba al espejo y me preguntaba: ¿Tendré la edad para esto? ¿Qué pasará con mi cuerpo? El mercado nos vende la falsa idea de que este mundo es solo para chicas de 20 años con cuerpos de revista, y el primer gran trabajo es romper ese prejuicio en nuestra propia cabeza.</p>
<p>Y el miedo más grande de todos: la privacidad. No quería que nadie me reconociera. No quería que un vecino, un familiar o un conocido del pasado se cruzara con mi perfil. Tenía pánico de perder el control de mi imagen.</p>

<h3>El secreto del éxito: Promoción inteligente y anonimato local</h3>
<p>¿Cómo superé ese miedo? Entendiendo que no hace falta exponer tu vida personal ante conocidos para tener un negocio millonario. Aprendí a jugar el juego de la promoción inteligente. Mientras mi perfil de OnlyFans es completamente profesional, mi estrategia de marketing se construye desde el anonimato hacia mi entorno: utilizando redes sociales dedicadas exclusivamente al negocio sin vincular mi identidad real, y explotando plataformas de altísimo alcance internacional.</p>
<p>Es decir, te promocionás de forma estratégica hacia afuera, buscando al cliente ideal en el mercado global, mientras tu entorno local permanece completamente a oscuras gracias al <strong>Geoblocking</strong>. Además, me especialicé en el nicho del <strong>FemDom (Dominación Femenina)</strong> y los fetiches, un mercado de alta rentabilidad donde la psicología, la autoridad y el control valen oro. El método de Dinastía Academy te va a enseñar a atraer a esos clientes de élite sin comprometer jamás la tranquilidad de tu vida diaria.</p>

<h3>La recompensa</h3>
<p>Hoy miro hacia atrás y sé que cada miedo superado valió la pena. Gracias a haber tomado esa decisión con valentía, a haberme plantado con autoridad y a haber tratado esto como una empresa seria, mi vida cambió por completo. Solo me dedico a esto. Logré la independencia absoluta y, lo más hermoso de todo, pude mudarme y hoy vivo en el lugar que siempre soñé: un rincón mágico rodeado de bosque y mar.</p>
<p>Si yo pude cambiar mi realidad a los 49 años, con tres hijos, partiendo desde casa y protegiendo mi privacidad desde las sombras, vos también podés hacerlo. No importa tu edad, no importa tu cuerpo, no importa de dónde arranques hoy. Lo único que necesitás es la determinación de querer construir tu propio Imperio.</p>
<p><strong>Bienvenida a tu nueva era. Bienvenida a Dinasty Academy.</strong></p>`,
      orderNum: 1,
      contentType: 'text'
    },

    // ─── Módulo Alerta: Reglas de OnlyFans ───
    {
      id: 'les-alerta-1',
      moduleId: 'mod-alerta-of',
      title: 'Reglas de OnlyFans y Cuidado de tu Cuenta',
      content: `<div class="alerta-roja-bloque">
<h2>⚠️ Alerta Roja: Reglas de OnlyFans y Cuidado de tu Cuenta</h2>
<p>El mayor error de un creador novato es no leer los términos y condiciones. <strong>OnlyFans no te da segundas oportunidades:</strong> si te banean la cuenta, bloquean tu documento de identidad de por vida y no podrás volver a crearte otra. Perdés tus seguidores, tu contenido y la plata que tengas acumulada.</p>
<p>Para que no cometas errores tontos, grabate a fuego estas reglas de lo que está estrictamente prohibido:</p>
</div>

<h3>🚫 1. Lo que NO podés subir (Contenido Prohibido)</h3>
<ul>
<li><strong>Fluidos reales:</strong> Está totalmente prohibido mostrar fluidos corporales reales en fotos o videos (salvo los lógicos de las relaciones sexuales tradicionales, pero nada extra de fetiches pesados, orina, sangre etc).</li>
<li><strong>Violencia o agresión:</strong> Nada de contenido que simule violencia real, golpes, marcas de dolor real o asfixia (cuidado con esto en los perfiles dominantes, el morbo tiene que ser hablado, no físico extremo).</li>
<li><strong>Armas y Drogas:</strong> No pueden aparecer armas de fuego, cuchillos ni sustancias ilegales en tus fotos o videos (ni siquiera de fondo o de utilidad).</li>
<li><strong>Animales (Mascotas en el set):</strong> Está terminantemente prohibido que aparezca cualquier tipo de animal en tus fotos o videos íntimos. Da igual si es tu perro durmiendo al fondo de la cama o tu gato pasando por atrás mientras grabás. Para la plataforma, la presencia de animales en contenido para adultos es motivo de baneo inmediato y definitivo.</li>
<li><strong>Menores de edad:</strong> No hace falta ni aclararlo, pero cualquier referencia o palabra que remotamente sugiera algo juvenil/escolar te tira la cuenta abajo al instante.</li>
</ul>

<h3>💸 2. Cuidado con los Métodos de Pago Externos</h3>
<ul>
<li>Está prohibido decir palabras como <strong>"Mercado Pago"</strong>, <strong>"PayPal"</strong>, <strong>"Transferencia"</strong>, <strong>"Crypto"</strong> o <strong>"Cabal"</strong> dentro del chat o la biografía. OnlyFans quiere su 20% de comisión. Si detecta que le estás pasando tu alias o tu enlace de pago externo a un cliente para cobrar por fuera, te cerrarán la cuenta en el acto. <strong>Todo se cobra a través de la plataforma.</strong></li>
</ul>

<h3>📢 3. Cuidado con la Publicidad que haces</h3>
<ul>
<li>No podrás promocionar otras plataformas de contenido similares: No pongas enlaces directos a páginas de la competencia en tu biografía (a menos que utilices un contenedor de enlaces externo como Linktree o Beacons).</li>
</ul>

<h3>💡 Consejo de Oro para tus Redes (Promoción)</h3>
<p>Cuando hagas publicidad en Instagram, TikTok o Twitter (X) para atraer clientes, cuidá el lenguaje. Las redes tradicionales usan inteligencia artificial para borrar cuentas de OnlyFans.</p>
<ul>
<li>No utilices la palabra <strong>"OnlyFans"</strong> en TikTok o Instagram; usá alternativas como <strong>"La página azul"</strong>, <strong>"Mi enlace de la biografía"</strong> o el emoji 💙.</li>
</ul>`,
      orderNum: 1,
      contentType: 'text'
    },

    // ─── Module 2: De Cero a Creadora ───
    {
      id: 'les-2-1',
      moduleId: 'mod-2',
      title: 'El Primer Paso: Crear tu Cuenta',
      content: `<h2>Antes de hablar de configuración o privacidad, tenés que saber dónde y cómo vas a construir tu Imperio.</h2>
<p>Hay un mito muy común entre las principiantes y el primer error que tenés que evitar es buscar esto en la tienda de tu celular.</p>

<h3>1. La Plataforma No es una App, es una Web</h3>
<p>Lo primero que tenés que entender es que las plataformas de contenido premium para adultos (como OnlyFans) no tienen una aplicación oficial para descargar en el celular. Debido a las políticas de censura de Apple y Google, estas plataformas funcionan de forma 100% segura únicamente a través de su página web oficial.</p>

<h4>El Peligro de las Apps Falsas</h4>
<p>Si entrás a la PlayStore (Android) o AppStore (iPhone) y buscás la aplicación, vas a encontrar decenas de opciones falsas. <strong>Jamás las descargues ni pongas tus datos ahí;</strong> son aplicaciones creadas por estafadores para robarte las contraseñas, tu identidad o tus futuras ganancias.</p>

<h4>Cómo Ingresar Correctamente</h4>
<p>Para entrar al sitio real, tenés que abrir el navegador de tu celular o de tu computadora (como Google Chrome) y escribir directamente la dirección oficial en la barra de URL (por ejemplo: <strong>www.onlyfans.com</strong>).</p>

<h3>2. Cómo Crear tu Cuenta desde Cero</h3>
<p>Una vez que estás adentro de la página web oficial, el proceso para registrarte como creadora es muy sencillo pero requiere atención:</p>

<h4>La Pantalla de Inicio</h4>
<p>Vas a ver un cuadro central para iniciar sesión o registrarte.</p>

<h4>Elegí tu Método</h4>
<p>Podés registrarte vinculando directamente una cuenta de Google (tu Gmail) para hacerlo más rápido. Sin embargo, para mantener tu negocio totalmente separado de tu vida personal, <strong>mi recomendación de élite es que te registres abajo donde dice "Sign up for OnlyFans"</strong>.</p>

<h4>Tus Datos de Acceso</h4>
<ul>
<li><strong>Correo Electrónico:</strong> Poné un mail que uses exclusivamente para tu trabajo (create un Gmail nuevo con tu nombre artístico, por ejemplo: GoddessVictoria@gmail.com). <em>Nunca uses tu correo personal de toda la vida.</em></li>
<li><strong>Contraseña:</strong> Elegí una clave segura que combine letras, números y algún símbolo. Anotala en un lugar seguro.</li>
<li><strong>Nombre de usuario provisorio:</strong> Poné cualquier nombre para avanzar; más adelante lo vamos a cambiar por tu nombre de marca definitivo.</li>
</ul>
<p>Aceptá los términos y condiciones y hacé clic en registrarte. La plataforma te va a mandar un correo de confirmación a tu mail; entrá a tu bandeja de entrada, hacé clic en el enlace que te enviaron y listo: <strong>tu cuenta base ya está abierta.</strong></p>`,
      orderNum: 1,
      contentType: 'text'
    },
    {
      id: 'les-2-2',
      moduleId: 'mod-2',
      title: 'Activación del Modo Creador',
      content: `<h2>Transformar tu Perfil a Cuenta de Creadora y Verificación de Identidad</h2>
<p>Una vez que creaste tu cuenta básica con tu correo electrónico y tu contraseña, tu perfil se encuentra en modo usuario. Tenés que cambiar tu rol al de Creadora de Contenido y validar que sos una persona real. Seguí esta guía paso a paso para hacer el proceso de forma correcta y evitar que la plataforma te rechace el trámite:</p>

<h3>1. Activación del Modo Creador</h3>
<ol>
<li>Ingresá a la plataforma con tu correo y contraseña.</li>
<li>Haz clic en el ícono de tu perfil (arriba a la derecha en la PC, o en el menú desplegable del celular) para abrir el centro de mandos.</li>
<li>Busca y selecciona la opción que dice <strong>"Become a Creator"</strong> o en banco (para ganar).</li>
<li>Al hacer clic ahí por primera vez, el sistema habilitará de forma automática el formulario oficial de seguridad para que comience tu proceso de verificación.</li>
</ol>`,
      orderNum: 2,
      contentType: 'text'
    },
    {
      id: 'les-2-3',
      moduleId: 'mod-2',
      title: 'La Verificación Perfecta',
      content: `<h2>La Verificación Perfecta</h2>
<p>Una vez que confirmaste tu correo electrónico, la plataforma te va a pedir que verifiques tu identidad para comprobar que sos una persona real y mayor de edad. Este paso es <strong>obligatorio y 100% confidencial;</strong> tus datos reales quedan guardados bajo estrictas normas de seguridad internacional y ningún cliente o usuario va a tener acceso a ellos jamás.</p>
<p>Para que el sistema te apruebe la cuenta a la primera y no pierdas días rebotada, tenés que preparar tus fotos siguiendo estas reglas de élite:</p>

<h3>1. La Foto de tu Documento (DNI o Pasaporte)</h3>
<p>El sistema utiliza inteligencia artificial para escanear tus datos, así que la foto de tu documento tiene que ser impecable.</p>
<ul>
<li><strong>Buscá buena luz:</strong> Ponete cerca de una ventana con luz natural. Evitá usar el flash de la cámara, porque suele rebotar en el plástico del DNI y tapa los números o tu fecha de nacimiento, lo que causa un rechazo automático.</li>
<li><strong>Encuadre completo:</strong> Apoyá el documento sobre una superficie lisa y oscura (una mesa de madera o un mantel oscuro). Al sacarle la foto, asegurate de que las cuatro esquinas del documento se vean perfectamente dentro de la pantalla. No recortes los bordes, ni edites la foto.</li>
<li><strong>Nitidez absoluta:</strong> Sostené el celular con las dos manos para que la foto no salga movida. Toda la letra del documento y tu foto de cara tienen que verse cristalinas. Sacale una foto al frente y otra al dorso.</li>
</ul>

<h3>2. La "Selfie"</h3>
<p>Este es el paso donde la mayoría comete errores y se traba por días. La plataforma te va a pedir una foto de tu rostro sosteniendo tu documento de identidad al lado de tu cara para comprobar que sos vos.</p>

<h4>El secreto de élite: Prohibido usar la cámara delantera</h4>
<p><strong>Jamás te saques esta foto como una selfie común con la cámara frontal de tu celular.</strong> La cámara delantera invierte las imágenes (efecto espejo), lo que hace que las letras del DNI salgan al revés, pierdan nitidez y el sistema te la rechace de inmediato.</p>
<ul>
<li><strong>Pedí ayuda:</strong> Para este paso, buscá a alguien y pedile que te saque la foto usando la cámara trasera de tu celular, que tiene el triple de definición y enfoque.</li>
<li><strong>El entorno perfecto:</strong> Ponete frente a un fondo limpio y una pared clara. Evitá que de fondo se vea ropa colgada, muebles desordenados o sombras extrañas. El foco visual tenés que ser vos y tu documento.</li>
<li><strong>La postura y tus dedos:</strong> Sostené el documento justo al lado de tu mejilla, al mismo nivel de tu rostro. Agarrá el plástico por los bordes con la punta de los dedos. Es un error muy común tapar con el pulgar tu fecha de nacimiento o tu nombre. Si tapás un solo dato, el sistema te rebota.</li>
<li><strong>Rostro despejado:</strong> Sacate la foto con la cara limpia, visible y buena luz natural de frente. Nada de anteojos de sol, gorras o pelo en la cara que te tape las facciones.</li>
</ul>

<h3>3. El último empujón: La Red Social de Respaldo</h3>
<p>Antes de enviar la solicitud, la plataforma te va a pedir que dejes el enlace a una red social externa (puede ser Instagram). Esto lo hacen para comprobar que sos una persona real y no un robot. <strong>Debes dejar la cuenta pública, con fotos tuyas hasta que te verifiquen.</strong></p>

<h3>4. La espera (¡No te asustes!)</h3>
<p>Una vez que apretás el botón de enviar, tus datos entran en revisión. El proceso de aprobación suele tardar entre <strong>24 y 48 horas</strong>. Te va a llegar un correo electrónico avisándote si tu cuenta fue aprobada con éxito. Si seguiste todos los consejos anteriores (la cámara trasera, la pared clara y el documento nítido), vas a ver el cartel verde de "Aprobada" a la primera. Y si no, volvés a intentarlo.</p>`,
      orderNum: 3,
      contentType: 'text'
    },

    // ─── Module 3: El Panel de Control ───
    {
      id: 'les-3-1',
      moduleId: 'mod-3',
      title: 'Tus Primeros Ajustes y el Menú Desplegable',
      content: `<h2>¡Felicitaciones! Tu cuenta ya está activa y verificada.</h2>
<p>Al ingresar por primera vez, es muy probable que la plataforma te aparezca completamente en inglés. No te preocupes ni intentes adivinar qué significa cada palabra: lo primero que vamos a hacer es poner el sistema en nuestro idioma para que trabajes con total comodidad.</p>

<h3>Cómo cambiar la plataforma a Español</h3>
<p>Para cambiar el idioma, vas a seguir esta ruta de tres clics:</p>
<ol>
<li><strong>Abrí el menú:</strong> Hacé clic en tu foto de perfil redonda que aparece arriba a la izquierda. Se va a desplegar una barra lateral con muchas opciones.</li>
<li><strong>Buscá la palabra Settings:</strong> En ese menú que se abrió, buscá el icono de la rueda dentada que dice Settings (Configuración) y hacé clic ahí.</li>
<li><strong>Cambia el idioma (Language):</strong> Dentro del nuevo menú, buscá la opción que dice Language (Idioma). Se va a abrir una lista con diferentes opciones: buscá y seleccioná Español. ¡Listo! De forma automática, toda la página web se va a recargar en castellano.</li>
</ol>
<p>Ahora sí, cuando vuelvas a hacer clic en tu foto de perfil, vas a ver tu menú de control idéntico al que te voy a explicar acá abajo.</p>

<p><strong>REGLA DE ORO:</strong> Crea un nombre alternativo con el cual te sientas identificado y úsalo en todas tus plataformas. Ese será tu escudo de privacidad y tu mayor marca de poder, así podrán encontrarte no solo en la página azul sino también en todas las redes sociales.</p>

<h3>Paso a paso, para qué sirve cada rincón indispensable de tu plataforma:</h3>

<h4>1. Mi Perfil</h4>
<p>Este es tu local, tu vidriera principal. Al hacer clic acá, vas a ir directo a tu muro. Es el lugar donde los clientes entran a ver tu biografía, tus precios de suscripción y todo el contenido (fotos y videos) que vayas publicando. Es fundamental que entres seguido para revisar que la estética de tu marca se vea impecable. Asegúrate de cargar un <strong>mínimo de 15 a 20 publicaciones</strong> con contenido variado, magnético y sugerente, pero <em>jamás explícito</em>. La meta es que cuando un suscriptor ingrese, encuentre un catálogo atractivo que justifique su atención. Recordá siempre la regla de oro del negocio: <strong>el contenido explícito, los desnudos y los videos pesados se reservan exclusivamente para la venta bajo candado (PPV) o propinas.</strong> El muro libre es solo para tentar al cliente, no para regalar tu mercadería.</p>
<p><em>Truco de Visibilidad Continua:</em> Asegúrate de tener siempre entre 3 y 4 historias activas en tu perfil. Las plataformas premian la constancia: mantener tus historias al día garantiza que aparecerás en los primeros lugares de la barra de inicio de tus suscriptores cada vez que abran su cuenta.</p>

<h4>2. Mis Referencias</h4>
<p>Este botón te muestra los números duros de tu negocio: gráficos de tus ganancias mensuales, cuántos suscriptores activos tenés, qué publicaciones tuvieron más alcance.</p>

<h4>3. Colecciones</h4>
<p>Esta sección es una de las herramientas de marketing más potentes que vas a tener dentro de tu panel de creador. Sirve para clasificar, ordenar y etiquetar a tus suscriptores en base a su comportamiento, sus gustos y el dinero que gastan.</p>

<h4>4. Archivo (Contenido Programado)</h4>
<p>Tu agenda de automatización y calendario de publicaciones. Este rincón es clave para organizar tu tiempo. Acá va todo lo que dejaste programado con día y hora exacta para que se publique solo.</p>
<ul>
<li><strong>Tu propio contenido:</strong> Podés dedicar un solo día de la semana a subir fotos o videos y dejarlos agendados para que se vayan publicando de forma automática.</li>
<li><strong>Publicidad cruzada (SFS):</strong> También es el lugar donde vas a ver y controlar las campañas de publicidad cruzada (SFS) que coordines con otras creadoras para promocionarse mutuamente.</li>
</ul>

<h4>5. Bóveda (Vault)</h4>
<p>Tu disco rígido secreto y el corazón del contenido. Esta herramienta vale oro. Es un banco de almacenamiento masivo donde quedan guardadas de forma automática todas las fotos y videos que subís a tu muro, a tus mensajes masivos o a tus historias. Sirve para que no tengas que volver a cargar un archivo desde tu celular si querés reutilizarlo: entrás a la Bóveda y lo reenviás desde ahí en un segundo.</p>

<h4>6. Configuración</h4>
<p>El cerebro técnico y de seguridad de tu cuenta. Desde acá controlamos todo lo que le da vida al negocio. Es el rincón sagrado donde vas a ir para ponerle el precio a tu suscripción mensual, configurar tu cuenta bancaria para cobrar y, lo más importante de todo, <strong>activar el Geoblocking (bloqueo geográfico)</strong> para blindar tu cuenta y que nadie de tu país pueda encontrarte.</p>
<p><strong>Configuración de Geobloqueo (Tu Escudo de Privacidad):</strong> Si tu miedo es que un familiar, vecino, conocido o alguien de tu ciudad te reconozca, tenés una herramienta de élite a tu disposición: el Bloqueo Geográfico (Geoblocking). Antes de subir tu primera foto, andá a la configuración, privacidad y seguridad y luego bloquear país… bloqueará por completo a tu país de residencia.</p>

<h4>7. Transmisiones (Live)</h4>
<p>Tus shows y encuentros en vivo. Te permite transmitir video en tiempo real para tus suscriptores. Es una herramienta muy potente ya que podés hacer transmisiones privadas o públicas donde te pagan propinas en vivo por minuto.</p>

<h4>8. Declaraciones (Statements)</h4>
<p>Tu contador virtual y el registro de tu dinero. Acá es donde vas a ver los números reales de tu empresa. Te muestra el historial detallado de cada dólar que ganaste, las propinas que te dejaron en los mensajes, los pagos de suscripciones y, lo más importante, el dinero que tenés acumulado disponible para retirar a tu cuenta bancaria.</p>

<h4>9. Estadísticas</h4>
<p>El termómetro de tu negocio. Te da los gráficos de rendimiento de tu perfil. Te muestra cuántos fans nuevos ganaste esta semana, qué posteos tuvieron más interacciones y de dónde viene el mayor flujo de dinero.</p>

<h4>10. Formularios de Liberación</h4>
<p>El blindaje legal para contenido compartido. Si en algún momento decidís subir una foto o video donde aparezca otra persona (por ejemplo, los pies de un sumiso, las manos de otra creadora o una colaboración), la plataforma te exige por ley que esa persona firme un formulario de autorización. También podés etiquetar directamente a otro creador o creadora y no se necesita el formulario.</p>

<h4>11. Tus tarjetas</h4>
<p>En esta sección es donde se carga una tarjeta de crédito o débito si vos querés comprar el contenido o suscribirte al perfil de otra creadora. Para tu rol como creadora no la vas a usar para recibir pagos, ya que esto es solo para gastar dentro de la plataforma.</p>

<h4>12. Banco (para ganar)</h4>
<p>El motor financiero de tu negocio. Este es el botón más importante para tu bolsillo. Aquí es donde vas a realizar el proceso de vinculación de tu cuenta bancaria internacional, o el método de pago que elijas para que la plataforma te transfiera tus ganancias acumuladas.</p>

<h4>13. Ayuda y soporte técnico</h4>
<p>Tu canal directo con la empresa. Si tenés algún problema técnico, si un pago se retrasa, o si tenés alguna duda sobre las normas de la página, te comunicas directamente.</p>

<h4>14. Modo de luz / Modo oscuro</h4>
<p>El ajuste visual para tus ojos. Cambia el diseño estético de la pantalla. Podés elegir el fondo blanco (Modo de luz) o el fondo negro mate (Modo oscuro).</p>

<h4>15. Cerrar sesión</h4>
<p>El botón de salida y seguridad. Te desconecta completamente de la plataforma.</p>`,
      orderNum: 1,
      contentType: 'text'
    },
    {
      id: 'les-3-2',
      moduleId: 'mod-3',
      title: 'Retiro de Dinero (Cómo Cobrar tus Dólares)',
      content: `<h2>Retiro de dinero (Cómo Cobrar tus Dólares)</h2>
<p>Una de las dudas más frecuentes al empezar es: ¿cómo cobro? Queremos darte la tranquilidad de que <strong>podés empezar a trabajar, recibir propinas y vender contenidos con candado desde el primer día,</strong> aunque todavía no tengas una cuenta bancaria asociada. Todo el dinero que generes se va a ir acumulando de forma segura dentro de tu billetera de la plataforma hasta que decidas retirarlo.</p>
<p>Para las creadoras en Latinoamérica, la vía más rápida, segura y utilizada para retirar las ganancias es a través de la plataforma <strong>Skrill</strong>, para luego pasarlo a <strong>Binance</strong> y finalmente recibirlo en tu banco o billetera virtual local (como Brubank, Mercado Pago, etc.).</p>

<h3>ALERTA DE SEGURIDAD: Los Peligros de los Métodos Directos en Argentina</h3>
<p>Antes de pasar a configurar tu billetera internacional para retirar tus ganancias, es fundamental que hablemos de un error crítico que cometen el 90% de las creadoras principiantes por falta de información.</p>

<h4>1. Trampa N°1: Transferencia Bancaria Local (Vía Pagomundo)</h4>
<p>Esta opción te promete enviar tus dólares directamente a tu cuenta bancaria tradicional (como Banco Provincia, Galicia, Santander) o a billeteras virtuales como Mercado Pago.</p>
<ul>
<li><strong>El peligro del dólar Oficial:</strong> Al ingresar una transferencia del exterior a un banco argentino, las regulaciones locales obligan a pesificar esos fondos de forma automática. Te van a liquidar tus dólares al valor del dólar oficial, <strong>perdiendo casi la mitad de tu dinero</strong> en comparación con el mercado paralelo (blue o MEP).</li>
<li><strong>Alerta AFIP y Bloqueos:</strong> Recibir transferencias internacionales directas en un banco local o en Mercado Pago activa todas las alarmas impositivas. El banco te va a congelar los fondos de inmediato y te va a exigir facturas de exportación de servicios y trámites burocráticos complejos para poder liberar tu plata.</li>
</ul>

<h4>2. Trampa N°2: Transferencia Directa de VISA</h4>
<p>Esta herramienta te ofrece transferir tus ganancias directo a tu tarjeta de débito o crédito VISA de siempre.</p>
<ul>
<li><strong>Pesificación Forzosa:</strong> Al igual que la transferencia bancaria, el dinero se convierte obligatoriamente a pesos a la peor cotización del mercado.</li>
<li><strong>Rechazos Automáticos:</strong> Los sistemas de seguridad de las tarjetas emisoras en Argentina suelen rebotar estos pagos internacionales por seguridad.</li>
</ul>

<p><strong>REGLA DE ORO DE DINASTÍA:</strong> En Argentina, todo lo que sea cobrar directamente a banco o tarjeta es una pérdida de dinero segura. Para mantener tus ganancias protegidas, cobrar el valor real del dólar del día y operar con total tranquilidad bajo el radar, en la academia utilizamos la única estrategia de élite comprobada: <strong>El circuito Skrill → Binance → Cuenta Local.</strong></p>

<h3>PASO 1: Creación Correcta de tu Cuenta Skrill</h3>
<ul>
<li><strong>El Correo Electrónico:</strong> Registrate en Skrill utilizando el mismo mail exacto que usaste para crear tu cuenta de OnlyFans.</li>
<li><strong>Nombres en Mayúsculas:</strong> Al colocar tu nombre y apellido, escribilos TODO EN MAYÚSCULAS. Debe coincidir de forma idéntica con tu DNI y con los datos de verificación que pusiste al aprobar tu perfil de contenido.</li>
<li><strong>La Divisa:</strong> Al momento de elegir la moneda de tu cuenta, configurala sí o sí en <strong>DÓLARES (USD)</strong>.</li>
</ul>

<h3>PASO 2: Activación y Primer Depósito</h3>
<p>Para que Skrill se active y te permita verificar tu identidad, la plataforma te pide realizar un primer depósito inicial de seguridad de aproximadamente <strong>$5 USD</strong>.</p>
<p><strong>ALERTA TÉCNICA:</strong> Este paso de fondeo inicial tenés que realizarlo únicamente desde una computadora. Desde el navegador del celular el sistema suele fallar.</p>
<ul>
<li><strong>El método correcto:</strong> Entra a Skrill desde la PC, seleccioná la opción "Pague en línea" y elegí el método RAPIPAGO. Coloca el equivalente a $5 USD, el sistema te va a generar un código o número de pago con el monto convertido a tus pesos locales. Sacale una foto a la pantalla, acercate a cualquier sucursal de Rapipago y abonalo en efectivo. Se te acreditará al instante en tu cuenta de Skrill en dólares.</li>
</ul>

<h3>PASO 3: Verificación de Identidad y Blindaje</h3>
<ul>
<li><strong>Identidad:</strong> La app te pedirá tomarle una foto a tu DNI de frente y dorso, y una selfie para corroborar que sos una persona real.</li>
<li><strong>Verificación de Domicilio:</strong> Te van a solicitar un documento que compruebe que vivís en la misma dirección que figura en tu documento. Podés subir un resumen de tarjeta de crédito o débito, o un impuesto público a tu nombre (luz, gas, internet).</li>
</ul>
<p>Cuando tu perfil de Skrill sea aprobado de forma oficial, vas a ver un <strong>círculo verde al lado de tu usuario</strong>. ¡Felicidades! Tu pasarela ya está blindada.</p>

<h3>PASO 4: Vinculación final con tu Plataforma</h3>
<ul>
<li>Entrá a tu panel de OnlyFans, abrí el menú lateral y dirígete a la sección que dice <strong>Banco (Add Bank / Banking)</strong>.</li>
<li>Seleccioná el método de pago alternativo <strong>Skrill</strong>.</li>
<li>Colocá los datos y el correo de tu cuenta de Skrill verificada.</li>
</ul>
<p>¡Listo! A partir de acá, los dólares de tus propinas, suscripciones y chats se transferirán a tu cuenta de Skrill. Desde ahí, utilizando la plataforma Binance, vas a poder pasar esos dólares al mercado P2P para enviártelos directo a tu banco de preferencia en pesos (como Brubank, Mercado Pago o tu CBU local) al valor del dólar del día.</p>

<h3>Instructivo de Élite: Cómo Vincular Skrill → Binance de Forma Directa (Vía Cripto)</h3>
<p>Si preferís no usar el mercado P2P y querés retirar tus dólares de Skrill directo a Binance convertidos en criptomonedas, podés hacer una transferencia directa usando <strong>USDT (Tether)</strong>, que es el dólar digital.</p>

<h4>Paso 1: Obtener la dirección de depósito en Binance</h4>
<ol>
<li>Ingresa a tu aplicación de Binance.</li>
<li>Anda a la opción Depositar y luego selecciona Depositar Cripto.</li>
<li>En el buscador de Moneda, elegí <strong>USDT (Tether)</strong>.</li>
<li>En la selección de Red, elegí sí o sí <strong>Ethereum (ERC20)</strong>.</li>
<li>El sistema te va a mostrar un código largo de números y letras (tu dirección de depósito). Toca el botón de Copiar dirección.</li>
</ol>
<p><strong>ALERTA DE SEGURIDAD:</strong> Asegúrate de seleccionar únicamente la red Ethereum (ERC20) tanto en Binance como en Skrill. Si elegís cualquier otra red por error, los fondos se perderán en el camino y no se podrán recuperar.</p>

<h4>Paso 2: Enviar el dinero desde Skrill</h4>
<ol>
<li>Ingresa a tu cuenta de Skrill.</li>
<li>Hacé clic en el botón Enviar, selecciona Cartera de criptomonedas.</li>
<li>Configura los datos del envío: Moneda: USDT, Red: Ethereum (ERC20), Cantidad: el monto que querés transferir.</li>
<li>En el tipo de destino, selecciona Binance.</li>
<li>Pegá la dirección de depósito que copiaste en el Paso 1. Revisa que todo coincida, confirma la operación y presiona Enviar.</li>
</ol>

<h4>Paso 3: Acreditación y Recomendación de Élite</h4>
<ul>
<li><strong>Confirmación:</strong> La transacción puede tardar unos minutos en procesarse en la red. Una vez completada, vas a ver tus USDT impactados directamente en tu balance de Binance.</li>
<li><strong>Consejo de Profesional:</strong> Antes de enviar montos grandes o retirar las ganancias de todo tu mes, hacé siempre una prueba con una cantidad mínima. Una vez que verifiques que llegó bien y que hiciste todo el caminito de forma correcta, recién ahí transferí el resto del capital.</li>
</ul>`,
      orderNum: 2,
      contentType: 'text'
    },

    // ─── Module 4: La Barra de Herramientas ───
    {
      id: 'les-4-1',
      moduleId: 'mod-4',
      title: 'Cómo armar tus publicaciones',
      content: `<h2>La Barra de Herramientas (Cómo armar tus publicaciones)</h2>
<p>Cuando vayas a tu perfil o al inicio y hagas clic en el recuadro que dice "Nuevo post", se va a desplegar una fila de pequeños iconos abajo del texto. Esta barra de herramientas es tu timón para cargar contenido, ponerle precio, armar encuestas o dejar el material programado.</p>
<p>Acá tenés el mapa de izquierda a derecha para que sepás qué hace cada icono:</p>

<h3>1. Icono de Imagen (Paisaje)</h3>
<p>Es el botón para subir fotos directamente desde la galería de tu celular o de tu computadora. Podés seleccionar una o varias imágenes para armar una galería en un mismo posteo.</p>

<h3>2. Icono de Cámara de Video</h3>
<p>Sirve para cargar tus archivos de video. Al igual que con las fotos, seleccionas el video que grabaste y se sube a la publicación.</p>

<h3>3. Icono de Micrófono</h3>
<p>Te permite grabar o subir notas de voz.</p>

<h3>4. Icono de Bóveda (Foto con un reloj/candado)</h3>
<p>Este botón te da acceso directo a tu Bóveda. Si querés republicar una foto vieja, o usar un video que ya tenías guardado en tu base de datos sin tener que volver a gastar datos subiéndolo desde el celular, tocá acá, lo elegís de tu carpeta y se carga al instante.</p>

<h3>5. Icono de Gráfico de Barras (Encuesta)</h3>
<p>Sirve para crear encuestas interactivas para tus fans. Podés preguntarles cosas como: ¿Qué fetiche quieren ver en el próximo video? ¿Qué outfit prefieren para mi sesión de fotos? Es ideal para generar interacción.</p>

<h3>6. Icono de Pregunta</h3>
<p>Te permite configurar publicaciones con encuestas donde el usuario puede interactuar.</p>

<h3>7. Icono de Reloj de Arena (Vencimiento del Post)</h3>
<p>Sirve para ponerle una "fecha de vencimiento" a tu publicación. Si querés subir una foto que solo esté disponible por 24 o 48 horas (como una promoción relámpago o un adelanto exclusivo), tocás acá y configuras el tiempo. Pasado ese plazo, el posteo se borra solo del muro. Sirve también para hacer SFS.</p>

<h3>8. Icono de Calendario con Tilde (Programar Publicación)</h3>
<p>Este botón conecta directo con lo que vimos en la sección anterior sobre el Archivo. Al tocar este calendario, elegís el día y la hora exacta del futuro en la que querés que se suba este posteo.</p>

<h3>9. Los Tres Puntos (...)</h3>
<p>Abre opciones secundarias de la publicación, como añadir precio a una publicación, objetivo de recaudación, etiquetar a otros creadores o formato de texto.</p>

<h3>10. TRANSMISIÓN EN VIVO</h3>
<p>Es el botón de acceso rápido para prender la cámara e iniciar un Show Live en vivo para tus suscriptores en ese preciso momento, notificando a todos tus fans para que entren a verte.</p>

<h3>11. Cómo subir una Historia (Stories)</h3>
<p>Aunque no aparezca directamente adentro del cuadro de texto común, al lado de tu foto de perfil en la pantalla de inicio o en tu muro vas a ver un círculo con el signo "+" que dice "Agregar". Sirve para subir fotos o videos cortos que solo duran 24 horas visibles y después desaparecen por completo.</p>
<p><strong>Tu estrategia de élite:</strong> Las Historias se usan para el "día a día" y generar urgencia.</p>`,
      orderNum: 1,
      contentType: 'text'
    },

    // ─── Module 5: Perfil e Identidad de Alto Valor ───
    {
      id: 'les-5-1',
      moduleId: 'mod-5',
      title: 'Identidad Digital y Seguridad Visual',
      content: `<h2>Identidad Digital y Seguridad Visual (Para perfiles Vainilla y Femdom)</h2>
<p>Tu cuenta ya está aprobada y sabés usar el panel, pero ahora está vacía. Es un lienzo en blanco. Antes de recibir a tu primer suscriptor, tenés que construir tu personaje y marca. En esta industria, tu nombre, tu foto de perfil y tu portada no son simples adornos: son las herramientas que van a definir tu estilo de contenido, filtrar al público correcto y hacer que los clientes quieran sacar la billetera.</p>

<h3>1. El Nombre Artístico (Tu Nombre de Marca)</h3>
<p>Elegí un pseudónimo o nombre que se adapte perfectamente al tipo de perfil que vas a tener:</p>
<ul>
<li><strong>Si hacés contenido Vainilla (Modelaje, sensual, lencería):</strong> Busca nombres que suenen dulces, sexis, frescos o elegantes en inglés o de alcance internacional. Podés combinarlo con un apellido artístico fantasioso o dejar el nombre solo si es llamativo.</li>
<li><strong>Si hacés contenido FemDom (Dominación / Fetiche):</strong> Busca nombres imperativos, aristocráticos o mitológicos que denoten autoridad inmediata y se entiendan en el mercado global. El nombre ya tiene que marcar quién manda.</li>
</ul>

<h4>El secreto de élite para el nombre de usuario (@usuario)</h4>
<p>Debe ser en inglés y muy fácil de encontrar para el suscriptor. <strong>Evitá a toda costa usar el guion bajo (_).</strong> El guion bajo hace que el nombre sea molesto de escribir, difícil de recordar y arruina las búsquedas cuando un cliente te quiere recomendar. Si tu nombre artístico ya está usado, en lugar de meterle guiones bajos o números, sumale palabras profesionales en inglés al final (ejemplo: Goddess, Queen). Que suene limpio, fluido y de categoría superior.</p>

<h3>2. Tu Foto de Perfil: Reglas Estrictas y Elección de Rostro</h3>
<p>Mostrar o no mostrar el rostro es 100% una elección personal de cada alumna. Podés armar un perfil súper exitoso dando la cara desde el primer día, o podés elegir el camino del misterio si preferís resguardar tu privacidad. <strong>Ambas opciones son totalmente válidas y facturan de igual manera.</strong></p>
<p>Sin embargo, para la foto de perfil la plataforma tiene reglas muy estrictas que tenés que cumplir para que no te penalicen la cuenta:</p>
<ul>
<li><strong>Prohibido los desnudos:</strong> La foto de perfil jamás puede contener desnudos explícitos. Tiene que ser una foto apta para todo público.</li>
<li><strong>Prohibido fotos de espaldas:</strong> Al menos al principio, no pongas una foto totalmente de espaldas donde no se reconozca una silueta clara de frente o de perfil.</li>
</ul>

<h3>3. La Foto de Portada (Banner)</h3>
<p>La portada es el cartel gigante de tu local a la calle. Es lo primero que impacta visualmente al usuario cuando hace clic en tu enlace. Sin importar el nicho que elijas, la imagen tiene que ser de <strong>alta definición</strong> y estar adaptada al formato horizontal estirado de la web. Un banner pixelado, borroso o mal recortado destruye instantáneamente el valor de tu suscripción.</p>`,
      orderNum: 1,
      contentType: 'text'
    },
    {
      id: 'les-5-2',
      moduleId: 'mod-5',
      title: 'El Arte de Redactar tu Biografía',
      content: `<h2>El Arte de Redactar tu Biografía (Tu Carta de Presentación)</h2>
<p>Una vez que el cliente entró atraído por tus fotos de perfil y portada, lo primero que va a leer es tu biografía. Si este texto es aburrido, genérico o está mal escrito, la venta se cae. Tu descripción tiene que ser magnética, concisa, estar en inglés (para el mercado internacional, que es el que nos importa) y reflejar con exactitud qué tipo de experiencia va a encontrar el suscriptor en tu muro.</p>

<h3>Opción A: La Biografía Vainilla (Sensual, Coqueta y Atractiva)</h3>
<p>Si tu perfil está enfocado al contenido sensual tradicional, tu biografía debe transmitir eso. El suscriptor tiene que sentir que al pagar la entrada va a acceder a tu lado más íntimo y privado.</p>
<ul>
<li><strong>El Gancho Inicial:</strong> Arrancá con un saludo sugestivo o una frase que los haga sentir especiales por estar ahí.</li>
<li><strong>Qué incluir en el texto:</strong> Una breve descripción de tu personalidad, qué van a encontrar adentro (fotos exclusivas, videos privados, charlas calientes por mensaje privado), una invitación clara a la acción.</li>
</ul>

<h3>Opción B: La Biografía FemDom / Fetiche (Autoridad y Reglas del Local)</h3>
<p>En el universo de la dominación y los fetiches, la biografía cambia radicalmente. Aquí no buscás ser dulce ni cercana; buscá marcar la cancha de entrada. Tu texto debe destilar superioridad, autoridad y dejar en claro que el acceso a vos es un privilegio.</p>
<ul>
<li><strong>El Filtro de Entrada:</strong> Lo primero que tenés que dejar claro es que no toleras perder el tiempo.</li>
<li><strong>Qué incluir en el texto:</strong> Tu título de autoridad (Goddess, Mistress, etc.), las reglas estrictas del perfil, los fetiches o temáticas principales que manejás en tu muro (Findom, SPH, JOI, CEI, Adoración de pies, Chastity, etc.).</li>
</ul>

<h3>Tips de Élite para Ambas Biografías</h3>
<ul>
<li><strong>Emojis con estrategia:</strong> No satures el texto de dibujitos. Usá emojis elegantes que sumen a la estética (flores o destellos para Vainilla; coronas, cadenas o billetes para FemDom).</li>
<li><strong>Menos es más:</strong> No escribas un testamento. El cliente no lee textos largos; escanea. El mensaje tiene que ser directo, cortito y contundente.</li>
<li><strong>El Menú de Servicios:</strong> Al final de la biografía, es excelente dejar una lista rápida de lo que ofreces (ejemplo: Custom videos, Sexting, Audio notes), para que el usuario sepa de entrada todo lo que te puede comprar adentro.</li>
</ul>`,
      orderNum: 2,
      contentType: 'text'
    },
    {
      id: 'les-5-3',
      moduleId: 'mod-5',
      title: 'Estrategia de Apertura: La Cuenta Gratis (Free)',
      content: `<h2>Estrategia de Apertura: El Poder de la Cuenta Gratis (Free)</h2>
<p>Al momento de lanzar tu perfil al mercado, existen dos caminos: abrir una cuenta paga o abrir una cuenta gratis. Para una creadora que inicia desde el absoluto cero, sin seguidores previos y sin una comunidad que la conozca, <strong>la recomendación de élite es comenzar con una Cuenta Gratis (Free).</strong></p>

<h3>¿Por qué comenzar con una Cuenta Free?</h3>
<ul>
<li><strong>Derriba la barrera de entrada:</strong> Los usuarios en internet no pagan por ver el contenido de alguien que no conocen. Una cuenta gratis te permite recibir un flujo masivo de suscriptores curiosos en tiempo récord.</li>
<li><strong>Tu base de datos de clientes:</strong> Es mucho más fácil convencer a una persona de que le dé clic al botón de "suscribirse" si es gratis. Así es como vas a construir tus primeros cientos de fans de la nada.</li>
<li><strong>Dónde se hace la verdadera plata:</strong> Que la cuenta sea gratis no significa que regales tu trabajo. El muro libre es solo el anzuelo. El verdadero dinero de este negocio se genera adentro: vendiendo videos exclusivos con candado a través de los mensajes privados, ofreciendo contenido personalizado y recibiendo propinas o tributos de los fans que quieren interactuar con vos.</li>
</ul>

<h3>La Regla de Oro del Feed Público</h3>
<p>El hecho de que tu cuenta sea gratuita implica que cualquiera puede entrar a mirar tu muro principal. Por lo tanto, tenés que cuidar tus publicaciones: <strong>En tu feed principal no podés publicar absolutamente nada que esté regalado.</strong> El feed se usa para mostrar contenido sugerente, fotos estéticas en lencería, adelantos muy cortitos, encuestas o textos atrapantes. Todo lo demás, va bloqueado con candado para que paguen por verlo.</p>

<h3>Paso a Paso: Cómo Configurar tu Mensaje de Bienvenida Automatizado</h3>
<p>Para automatizar tu perfil y recibir a cada usuario que se une a tu cuenta gratis, vas a dejar programado un mensaje que la plataforma les enviará de forma automática apenas se suscriban. Esto sirve para abrir el canal de comunicación de inmediato.</p>
<ol>
<li>Entra a tu cuenta y abrí el menú lateral izquierdo.</li>
<li>Busca la sección de Configuración (Settings) y luego ingresa a conversaciones.</li>
<li>Activa la opción que dice <strong>Automated Welcome Message</strong>.</li>
<li>En el cuadro de texto, vas a redactar un saludo inicial en inglés según el estilo de tu perfil.</li>
</ol>

<p><strong>REGLA DE ORO DE ÉLITE (Lo que NO te aconsejo hacer):</strong> Enviar un contenido con candado (PPV) pago en este primer mensaje. Creer que porque se suscribieron te van a pagar un candado de entrada a ciegas es un error que destruye tu negocio. Si les pones un pago de entrada, el usuario se asusta, no te habla y la comunicación se corta antes de empezar. <strong>El primer mensaje debe ser abierto, libre y magnético,</strong> diseñado exclusivamente para que el cliente te responda y empiece la interacción.</p>

<p><em>Nota de la Academia:</em> No te preocupes si todavía no sabés cuál es tu perfil ideal. Más adelante en la academia vamos a ver en detalle cuáles son los diferentes perfiles que existen y cuáles son los que más monetizan. Además, vas a tener una charla personalizada conmigo para analizar tu caso, guiarte paso a paso y elegir juntas el personaje que mejor se adapte a vos y a tu personalidad.</p>`,
      orderNum: 3,
      contentType: 'text'
    },

    // ─── Module 6: Guía de Tarifas ───
    {
      id: 'les-6-1',
      moduleId: 'mod-6',
      title: 'Tarifas de Bóveda (Contenido Pregrabado)',
      content: `<h2>Tarifas de Bóveda (Contenido Pregrabado)</h2>
<p>Este es el material que ya tenés listo y guardado. Lo enviás por chat masivo o privado como venta directa (PPV):</p>

<h3>Videos Femdom (SPH, humillación, sissy, cuck, etc.)</h3>
<p>Entre <strong>$35 y $45 USD</strong> por 2 minutos para arrancar. Si el cliente responde bien y sigue comprando, le vas aumentando el valor en los próximos paquetes o pidiéndole propinas (tips).</p>

<h3>Videos Explícitos</h3>
<p><strong>$35 USD</strong> por cada minuto de video.</p>

<h3>Packs de Fotos</h3>
<p>Entre <strong>$3 y $5 USD</strong> cada 5 fotos aproximadamente.</p>`,
      orderNum: 1,
      contentType: 'text'
    },
    {
      id: 'les-6-2',
      moduleId: 'mod-6',
      title: 'Contenido Personalizado (Custom)',
      content: `<h2>Contenido personalizado (Pedidos Personalizados)</h2>
<p>Son videos especiales a pedido, donde el cliente elige la temática o quiere que digas su nombre.</p>

<p><strong>REGLA DE ORO DE LA EMPERATRIZ:</strong> NUNCA grabes ni envíes un contenido personalizado si no te pagaron la TOTALIDAD por adelantado mediante una propina. Evitá pérdidas de tiempo y estafas. <strong>Primero la plata, después el trabajo.</strong></p>

<h3>Femdom Custom</h3>
<p><strong>$60 a $80 USD</strong> por un video de 2 a 3 minutos.</p>

<h3>Explícito personalizado</h3>
<p><strong>$80 a $120 USD</strong> por un video de 2 minutos aprox.</p>`,
      orderNum: 2,
      contentType: 'text'
    },
    {
      id: 'les-6-3',
      moduleId: 'mod-6',
      title: 'Servicios en Tiempo Real',
      content: `<h2>Servicios en Tiempo Real</h2>
<p>Monetizá tu interacción directa y el minuto a minuto:</p>

<h3>Sexting (Chat Hot)</h3>
<p><strong>$50 a $60 USD</strong> la media hora de interacción por texto. Incluye el ida y vuelta, 2 o 3 fotitos sugerentes y algunos clips muy cortos sacados de tu bóveda.</p>

<h3>Videollamadas</h3>
<ul>
<li>5 minutos: <strong>$80 USD</strong></li>
<li>10 minutos: <strong>$100 USD</strong></li>
<li>15 minutos: <strong>$140 USD</strong></li>
</ul>

<p>De igual forma no tengas miedo de enviar contenido mucho más barato con tal de hacer una venta con algún cliente rata.</p>`,
      orderNum: 3,
      contentType: 'text'
    },

    // ─── Module 7: Primeros Suscriptores ───
    {
      id: 'les-7-1',
      moduleId: 'mod-7',
      title: 'Estrategias de Tráfico y Difusión',
      content: `<h2>¿Cómo obtener tus primeros suscriptores desde cero?</h2>
<p>Una vez que tu feed está armada, el siguiente paso es hacer que la gente se entere de que existís. Para conseguir tus primeros fans sin gastar un centavo, vas a utilizar los canales de difusión externos de la plataforma:</p>

<h3>Promoción Cruzada (SFS)</h3>
<p>Recordá lo que vimos en el menú "Archivo": te promocionás su link en tu muro y ella promociona el tuyo en el suyo. Así se intercambian fans constantemente, además <strong>HXH (Historia por historia)</strong> o mensajes masivos entre las creadoras.</p>

<h3>Redes de Tráfico Orgánico</h3>
<p>Utilizarás plataformas como Reddit, Twitter (X) o Telegram, Instagram para publicar pequeñas muestras de tu contenido estético (siempre respetando las normas de cada lugar) y dejando el enlace directo a tu cuenta gratis para que vayan a suscribirse de inmediato.</p>

<h3>Nota de Seguridad y Privacidad de Élite</h3>
<p>Queremos darte la tranquilidad absoluta de que en ninguna de estas redes sociales externas (Reddit, Twitter, Telegram o Instagram) estás obligada a mostrar tu rostro. Podés armar campañas publicitarias, crear cuentas nuevas sumamente exitosas, estéticas y magnéticas manteniendo tu cara en total anonimato si así lo elegís.</p>

<p><strong>Importante:</strong> Recordá que cada una de estas redes tiene sus propias reglas, algoritmos y estrategias específicas para crecer. Cómo utilizar y optimizar al máximo cada plataforma para atraer miles de fans sin cometer errores será dictado en un curso avanzado e independiente más adelante. Ahora, nuestro foco es dejar tu centro de mandos listo para facturar.</p>

<h2>Bienvenida a tu Nueva Era</h2>
<p>Llegaste al final de este manual básico, pero este no es el destino: es apenas el día uno de tu nueva Dinastía. Construir una marca de alto valor, animarte a monetizar tu sensualidad, tu creatividad o tu autoridad no es un camino fácil. Exige disciplina, romper con prejuicios y pararte frente al mundo sabiendo exactamente cuánto vale tu tiempo. Ya diste el paso más difícil, que es arrancar y ordenar tu vidriera. Ahora te toca salir a conquistar el mercado.</p>

<p>Si estás lista para no quedarte sola en el camino y querés acelerar tu proceso para multiplicar tus ingresos, tenés la oportunidad de acceder a nuestras herramientas y espacios de categoría superior. No viniste hasta aquí para ser una creadora más del montón; viniste a construir un imperio bajo tus propios términos. Ponte la corona, adueñate de tu espacio y salí a reclamar lo que es tuyo. El mercado es enorme, los dólares están ahí afuera y tu nueva era empieza hoy. <strong>¡A facturar, reina!</strong></p>`,
      orderNum: 1,
      contentType: 'text'
    },

    { id: 'les-fet-1', moduleId: 'mod-fet-1', title: 'El Secreto de la Élite Digital', content: `<p>Si estás leyendo este manual, es porque tomaste la decisión de dejar de competir por centavos en el mercado masivo y decides entender cómo funciona la verdadera riqueza en la industria del contenido exclusivo.</p>
<p>La mayoría de las creadoras cometen el mismo error una y otra vez: creen que para facturar grandes sumas necesitan mostrar más, bajar sus precios o rogar por la atención de miles de seguidores genéricos. Se desgastan, regalan su tiempo y terminan frustradas porque el mercado masivo es una carrera hacia el fondo donde gana el que cobra más barato.</p>
<p>Las creadoras de elite jugamos a otro juego. Nosotros no buscamos la masa; buscamos el nicho hiperespecializado .</p>
<p>Este curso no es un catálogo de curiosidades. Es un tratado de psicología aplicada, marketing de nicho y monetización avanzada . A lo largo de estas páginas, vas a aprender a mirar los fetiches no desde el prejuicio o el tabú, sino con los ojos de una empresaria digital. Vas a entender qué pasa por la mente de los suscriptores más obsesivos y, lo más importante, cómo transformar esa fascinación en un negocio legítimo, seguro, sumamente rentable y bajo tus propias reglas.</p>
<p>Vas a descubrir que el verdadero activo de este negocio no es solo tu físico, sino tu capacidad para encarnar fantasías, establecer límites profesionales y construir un espacio seguro donde el cliente esté dispuesto a pagar tarifas premium simplemente por el privilegio de tu interacción.</p>
<p>Te doy la bienvenida a la especialización. Prepárate para cambiar tu mentalidad, blindar tu privacidad y multiplicar tus ingresos.</p>
<p>Emperatriz Elizabeth</p>
<p>Directora de la Academia</p>`, orderNum: 1, contentType: 'text' },
    { id: 'les-fet-2', moduleId: 'mod-fet-2', title: 'El Poder de la Especialización: Por qué los fetiches facturan el triple', content: `<p>El error más común de una creadora es querer gustarle a todo el mundo. Creen que publicando contenido genérico o masivo van a atraer a más clientes. Sin embargo, en la economía digital moderna, el que mucho abarca, poco aprieta.</p>
<p>El mercado de masas es altamente competitivo y los precios están tirados a la baja. Cuando te especializas en un fetiche, pasa algo completamente diferente:</p>
<p>Desaparece la competencia común: Dejas de competir contra millones de perfiles genéricos. Te volvés una opción exclusiva para un grupo específico de consumidores.</p>
<p>Inversión emocional alta del cliente: El comprador de fetiches no busca solo estimulación visual rápida; busca sacar una fijación o fantasía que muchas veces lleva años reprimiendo o perfeccionando en su mente.</p>
<p>Inelasticidad del precio: Un cliente fetichista no está buscando "lo más barato". Está buscando a la persona ideal que entienda, respete y ejecute su fantasía a la perfección. Si demostraste profesionalismo y autoridad en tu nicho, podrás cobrar tarifas tres o cuatro veces más altas por una sola foto o video personalizado que lo que cobraría un modelo genérico por un álbum completo.</p>
<p>Tu primera regla de negocio como creadora de élite es: Abrazar el nicho. Cuanto más específico y enfocado sea tu contenido, más valioso se vuelve para el cliente correcto.</p>`, orderNum: 1, contentType: 'text' },
    { id: 'les-fet-3', moduleId: 'mod-fet-2', title: 'Entender el Deseo sin Juzgar: Creación de un espacio seguro', content: `<p>Para monetizar con éxito en el mundo de los fetiches, es obligatorio despojarse de cualquier tipo de prejuicio moral o personal. Los suscriptores que consumen este contenido suelen cargar con un peso psicológico grande: la vergüenza, el miedo al rechazo social o el temor a ser juzgados por sus parejas o entornos cotidianos.</p>
<p>El verdadero secreto de las creadoras que más facturan en este nivel no es solo su físico, sino su capacidad para crear un espacio seguro.</p>
<p>Validación y confidencialidad: Cuando un cliente te escribe al privado confesando un fetiche específico, está abriendo una parte vulnerable de su psicología. Tu respuesta jamás debe denotar asco, burla o sorpresa. Debe transmitir madurez profesional, respeto y absoluta confidencialidad.</p>
<p>El valor del alivio psicológico: El cliente no solo te paga por la foto del pie, la axila o el látex; te paga por la liberación mental de poder disfrutar de su fantasía sin sentirte un bicho raro. Al validar su deseo de forma profesional, generará un lazo de lealtad y fidelidad comercial que es casi imposible de romper. El suscriptor se vuelve un cliente recurrente porque sabe que en tu chat encuentra un refugio que no tiene en ningún otro lado.</p>`, orderNum: 2, contentType: 'text' },
    { id: 'les-fet-4', moduleId: 'mod-fet-2', title: 'El \"Alter Ego\" Profesional y la Protección de Identidad', content: `<p>Trabajar en nichos de alto rendimiento y fetiches requiere que aprendas a separar perfectamente tu vida real de tu marca comercial. Esto no solo es vital por una cuestión de seguridad digital y privacidad, sino por pura estrategia de marketing.</p>
<p>La construcción del Alter Ego: En tu vida cotidiana sos una persona, pero frente a la pantalla y en tus plataformas sos una figura de autoridad, una fantasía viviente, un personaje diseñado para el negocio. Esta separación mental te protege: si un cliente rechaza un precio o si recibes un comentario desubicado, no te están atacando a vos, están interactuando con el personaje. El Alter Ego te permite mantener la mente fría y cobrar lo que vale tu trabajo sin involucrar tus emociones personales.</p>
<p>Blindaje de privacidad: Para trabajar fetiches con total tranquilidad, tu estructura de seguridad debe ser impecable. Esto incluye:</p>
<p>Utilizar un nombre artístico sólido, imponente y comercial (que transmite la autoridad o la vibración de tu nicho).</p>
<p>Configurar el geobloqueo estricto en tus plataformas principales para evitar que tu contenido sea visible en tu país de residencia actual.</p>
<p>Asegurar que tus redes de promoción (como Reddit o Telegram) no estén vinculadas a tus correos personales, números de teléfono reales o contactos de tu agenda.</p>
<p>Al blindar tu identidad, ganas la libertad absoluta para desarrollar tu marca al nivel más alto posible, sabiendo que tu vida privada está completamente protegida bajo llave.</p>`, orderNum: 3, contentType: 'text' },
    { id: 'les-fet-5', moduleId: 'mod-fet-3', title: 'SPH (Small Penis Humiliation / Humillación por Tamaño)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>A diferencia de lo que la mayoría de las creadoras principiantes cree, el cliente de SPH no busca una agresión real que lo destruya emocionalmente. Lo que busca es un silencio del ego masculino bajo un entorno controlado.</p>
<p>El alivio de la vulnerabilidad: En el mundo real, los hombres cargan con una enorme presión social respecto a su tamaño, rendimiento y masculinidad. El SPH actúa como una válvula de escape: al exponer su mayor "inseguridad" ante una figura de autoridad (su Diosa) y ser humillado por ello, se libera de la presión de tener que demostrar nada.</p>
<p>El contraste de poder: El placer erótico proviene de la enorme asimetría. Ver a una mujer empoderada, segura y perfecta reírse sutilmente o subestimar su anatomía los coloca de inmediato en una posición de sumisión psicológica absoluta.</p>
<p>La validación del deseo: Aunque se llame "humillación", para ellos es una forma de atención altamente personalizada. Que una creadora de élite se detenga a mirar, juzgar y opinar sobre ellos (aunque sea para disminuirlos) es el mayor premio.</p>
<h3>2. Los Códigos Verbales y de Comportamiento (Cómo manejar el rol)</h3>
<p>El SPH es 90% psicología y lenguaje, para ejecutarlo, hay que dominar tres niveles de tono:</p>
<p>Tono 1: La Indiferencia o Decepción (El más letal y buscado). En lugar de gritar, la creadora mira a la cámara con aburrimiento, lástima o una sonrisa burlona. Frases como: ¿De verdad me hiciste abrir el chat privado para mostrarme eso?, Es tierno, parece un pequeño camaron, o No sé si estás emocionado o si todavía estás dormido.</p>
<p>Tono 2: El Enfoque Clínico o de Evaluación. Trate el tema como si fuera un examen o una inspección profesional. Describir los detalles con frialdad matemática: Medidas insignificantes, Falta de desarrollo , Incapacidad de dar la talla .</p>
<p>Tono 3: El Enfoque de "Dominante Protectora" (Tu sello de élite). Redirigir la humillación hacia una función útil. En lugar de solo humillarlo, se le da un propósito: Sos demasiado pequeño para aspirar a una mujer real, por eso tu único lugar es servirme económicamente, Tu tamaño te condena a ser un tributador silencioso, acepta tu realidad .</p>
<h3>3. Estética, Ángulos y Producción Visual</h3>
<p>El contenido visual de SPH no requiere que la creadora muestre más; el foco visual es el lenguaje corporal de superioridad:</p>
<p>Ángulos de cámara de arriba hacia abajo: Colocar la cámara ligeramente abajo para que la creadora mire hacia abajo (hacia la lente), reforzando la idea de que el cliente está a sus pies.</p>
<p>Uso de las manos para comparar: Utilizar gestos universales con los dedos (como el espacio mínimo entre el pulgar y el índice) para ilustrar el tamaño mientras miras a la cámara con burla.</p>
<p>Lentes o accesorios intelectuales: Usar lentes o ropa ejecutiva/oficina complementa muy bien el rol de "evaluadora" o "jefa" que analiza el rendimiento del sujeto.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Este fetiche es una mina de oro en los mensajes privados (DM). Las dos dinámicas de mayor rendimiento económico son:</p>
<p>Las Evaluaciones de Tamaño ( Cock Ratings ): Es el servicio estrella de SPH. El cliente paga una tarifa fija alta por enviar una foto de su anatomía. La creadora responde con un audio (de 1 a 2 minutos) , una humillación escrita o un video corto destruyendo su ego de forma elegante, usando los códigos verbales anteriores, obvio todo tiene diferentes precios. Regla de élite: Nunca se entrega una calificación positiva en este nicho; el cliente paga explícitamente por la nota baja y la burla profesional, aunque parezca que lo tiene grande, busquen algo horrible que resaltar.</p>
<p>Asignación de "Tributos de Consuelo": Cuando un cliente se siente expuesto y humillado en el chat, la forma de cerrar la venta es decirle que la única manera de compensar su "falta de masculinidad" ante tus ojos es a través de un tributo financiero o una propina alta.</p>`, orderNum: 1, contentType: 'text' },
    { id: 'les-fet-6', moduleId: 'mod-fet-3', title: 'INVESTIGACIÓN DE NICHO: CASTIDAD', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>El deseo detrás de la castidad masculina es la renuncia absoluta al control biológico. Para el hombre, el impulso sexual suele dictar muchas de sus conductas diarias; cederle la llave de su dispositivo a una mujer es entregarle las riendas de su cuerpo.</p>
<p>La transferencia de la toma de decisiones: Al igual que en otros fetiches psicológicos, el suscriptor busca aliviar la carga mental. En su jaula de castidad, él ya no decide cuándo, cómo ni si se le permite sentir placer. Vos sos el único árbitro.</p>
<p>El aumento de la anticipación (Teasing): La castidad genera una acumulación de energía y frustración erótica (negación). Cada día encerrado hace que el suscriptor esté más desesperado por tu atención, lo que eleva su nivel de obsesión y su predisposición a pagar con tal de mantenerte feliz.</p>
<p>El estatus de pertenencia: Llevar el candado de su Goddes lo hace sentir "marcado" o de tu propiedad, incluso a la distancia. Se convierte en un esclavo devoto en su vida cotidiana.</p>
<h3>2. Los Códigos Verbales y de Comportamiento</h3>
<p>El manejo del chat en castidad requiere una combinación de firmeza, frialdad corporativa y esa vibra de "Dominante Protectora" que sabe administrar los tiempos del sumiso:</p>
<p>Tono 1: La Propietaria de la Llave ( Keyholder ). Hablar desde la posición de quien posee el derecho absoluto sobre su cuerpo. Frases como: Tus deseos ya no te pertenecen, ahora me pertenecen a mí , La jaula te queda perfecta, te recuerda cuál es tu lugar , o Hoy no hay liberación, seguí acumulando frustración para mí .</p>
<p>Tono 2: El Placer como Recompensa Comercial. Desvincular el orgasmo de la biología y atarlo directamente al rendimiento financiero o de tareas: La llave tiene un precio y hoy tu billetera no estuvo a la altura , o Quizás si tu tributo de esta semana es lo suficientemente generoso, considera darte unos minutos de libertad .</p>
<p>Tono 3: El Cuidado y la Seguridad (Límites Profesionales). Como Dominante Protectora, debes recordarle que la castidad requiere responsabilidad. Monitorear que el dispositivo, la piel, exíjirle higiene y establezca que el control es psicológico(obviamente todo eso monetizado, para para higienizarse, y para un control diario del dipositivo) Un sumiso que se siente cuidado en su encierro es un sumiso que nunca se va del chat.</p>
<h3>3. Estética, Herramientas y Producción Visual</h3>
<p>La castidad digital evolucionó muchísimo y hoy combina la fotografía tradicional con la tecnología moderna:</p>
<p>Uso de plataformas de hardware (Chaster): Hoy en día existen candados inteligentes que se vinculan a aplicaciones como Chaster. Vos, como Keyholder , podrás controlar el tiempo de bloqueo digitalmente desde tu celular, agregarle "penalizaciones" de tiempo, o hacer que otros usuarios voten si se queda encerrado.</p>
<p>Planos visuales de la posesión: fotos sosteniendo la llave física (o el celular con la aplicación de Chaster) frente a la pantalla con una mirada de superioridad. Fotos jugando con la llave o usándola como colgante/dije transmiten un mensaje de control absoluto.</p>
<p>Videos de inspección ( Lock Inspections ): El cliente te manda un video demostrando que el dispositivo está bien puesto y cerrado. Vos le respondés  y evaluás si la jaula es lo suficientemente restrictiva o si necesita un candado más estricto.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Este fetiche está diseñado para generar ingresos recurrentes a mediano y largo plazo. Las dinámicas más rentables son:</p>
<p>Venta de "Días de Candado" (Extensiones de tiempo): El cliente entra a un juego donde, por cada día que quiere demostrar su sumisión (o por cada penalización si se porta mal), debe pagar una tarifa fija. Vos cobras por mantener el candado bajo llave.</p>
<p>Customs de Tortura Psicológica (Tease and Denial ): Videos donde te mostras sumamente provocativa, lencería de elite o texturas premium, estimulando visualmente al cliente a través de la pantalla mientras le recuerda que está encerrado y que no puede tocarse. El contraste entre el estímulo visual y la imposibilidad física de reaccionar les vuela la cabeza y pagan fortunas por esos clips.</p>
<p>La "Tasa de Liberación" ( Unlock Fee ): Cuando se cumple el tiempo o el sumiso ya no aguanta más la frustración, la liberación definitiva de la jaula o el permiso para un orgasmo se vende como el producto más caro de tu tarifario. El placer se convierte en un artículo de lujo que solo vos podés autorizar.</p>`, orderNum: 2, contentType: 'text' },
    { id: 'les-fet-7', moduleId: 'mod-fet-3', title: 'CEI (Instrucciones para comer semen)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>El CEI es el fetiche del quiebre definitivo del orgullo y la sumisión biológica. El esperma masculino representa, en la psicología tradicional, el símbolo de su virilidad y su potencia. Obligarlo a consumirlo es una de las mayores demostraciones de entrega.</p>
<p>La inversión de los roles tradicionales: En la pornografía común o el imaginario masivo, el hombre suele ser quien "marca" a la mujer. El CEI invierte esto de manera radical: el sumiso se ve obligado a consumir su propio deseo bajo las órdenes de su diosa, borrando cualquier rastro de dominancia masculina.</p>
<p>La humillación higiénica y moral: Alrededor del esperma hay un fuerte tabú social e higiénico. Romper ese tabú genera una tremenda inyección de adrenalina y dopamina en el cerebro del fan, combinando la culpa con el placer de la obediencia absoluta.</p>
<p>La devoción total: El cliente que busca CEI quiere demostrarte que no tiene límites cuando se trata de complacer tus mandatos. Para él, tragar es el acto supremo de rendición ante tu figura.</p>
<h3>2. Los Códigos Verbales y de Comportamiento (Cómo manejar el rol)</h3>
<p>El CEI es 100% dirección verbal y lenguaje corporal. El tono de la creadora debe ser frío, demandante y completamente natural, como si estuvieras ordenando una tarea doméstica rutinaria:</p>
<p>Tono 1: La Limpieza Obligatoria. Tratar el acto como una cuestión de higiene y orden en tu presencia digital. Frases como: No vas a dejar ese desastre en mi chat , Limpiá tu propio desorden inmediatamente, o Tu virilidad es basura, así que tragátela.</p>
<p>Tono 2: El Enfoque de Reciclaje Psicológico. Enfocar el discurso en que su energía no merece ser desperdiciada en el ambiente, sino devuelta a él mismo. Sos tan insignificante que lo único que merecés consumir es tu propia frustración , mostrame que sos un buen esclavo y no dejes caer ni una sola gota .</p>
<p>Tono 3: El Sello de Dominante Protectora. Manejar la intensidad. Monitorear que el cliente esté cómodo con el nivel de juego psicológico (establecer si es solo una fantasía accionada o si lo va a ejecutar en tiempo real) y guiarlo con calma pero con una autoridad implacable para que no se sienta desamparado en el clímax del fetiche.</p>
<h3>3. Estética, Ritmo y Producción Visual</h3>
<p>Para este tipo de videos o audios, la producción visual se enfoca en la cara, los gestos y los comandos de la creadora:</p>
<p>Planos cerrados al rostro: El video debe filmarse como si estuvieras mirando directamente al cliente a los ojos mientras él realiza la acción. Tu mirada fija y sin parpadear es el ancla que lo mantiene sumiso.</p>
<p>El uso de accesorios de control: Sostener una copa, jugar con una cuchara pequeña de manera sugerente o burlona, ​​o simplemente apuntar con el dedo a la cámara mientras das las instrucciones pausadas.</p>
<p>Estética imponente o ejecutiva: Ropa que transmite estatus alto (trajes, camisas impecables, o lencería armada muy sofisticada). El contraste entre tu pulcritud y el acto que él está realizando eleva el fetichismo al máximo.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Este nicho genera tarifas altísimas en los mensajes privados debido al nivel de personalización y el "guion de voz", pero también se puede realizar por chat si no te animas:</p>
<p>Videos de Instrucción con Guión: El cliente paga por un video personalizado donde la creadora va dictando el ritmo del acto paso a paso: el inicio, la estimulación, el momento exacto en el que debe recolectarlo y la orden final e inapelable de tragar mirando a la pantalla. Cada paso se cobra como un extra.</p>
<p>Audios de Comando por Mensajería Privada: Notas de voz cortas pero fulminantes. Muchos sumisos no necesitan video; les basta con escuchar tu voz firme y fría en un audio dándoles la orden. Son rapidísimos de producir y se venden con un margen de ganancia enorme.</p>
<p>La "Prueba de Obediencia": El modelo de negocio se cierra cuando le exigís al cliente que te envía una foto o video corto demostrando que cumplió tu orden al pie de la letra para poder seguir hablando con vos en el chat, cobrándole además una "tasa de revisión".</p>`, orderNum: 3, contentType: 'text' },
    { id: 'les-fet-8', moduleId: 'mod-fet-3', title: 'SISSYFICACIÓN (Feminización Guiada)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>Para entender este fetiche, hay que sacarse la idea de que el cliente quiere ser una mujer trans real en su vida diaria. En la enorme mayoría de los casos, son hombres cisgénero, muchas veces con profesiones de alta responsabilidad (médicos, abogados, ejecutivos), que cargan con una pesada armadura de masculinidad en el mundo real.</p>
<p>El quiebre de la carga masculina: Al sissyficarse, el fan se despoja por completo de la presión social de "ser el hombre", proveer, ser fuerte o tomar decisiones. Cede su masculinidad a su Goddes porque la siente como una carga.</p>
<p>Erotización de la sumisión extrema: En la psicología de este nicho, "lo femenino" está colocado (por el propio sumiso) en una posición de vulnerabilidad y sumisión frente a la Dominante. Volverse una sissy es la forma gráfica y física de demostrar que está completamente por debajo de tu autoridad.</p>
<p>La búsqueda de identidad y validación: Sienten una mezcla muy potente de excitación y vergüenza. Tu rol como Dominante no es sanar esa vergüenza, sino transformarla en el motor del juego: vos le das permiso de explorar ese lado, lo moldeás a tu gusto y lo validás como tu "muñequita" privada.</p>
<h3>2. Los Códigos Verbales y de Comportamiento</h3>
<p>El lenguaje en la sissyficación es sumamente específico. Se basa en la reeducación del sujeto, el uso de términos específicos y el cambio de pronombres:</p>
<p>Tono 1: La Mentora / Diseñadora de Modas Estricta. Tratar el cuerpo del sumiso como un lienzo que te pertenece y que vas a transformar. Frases como: Ese cuerpo tosco no te queda bien, vas a lucir mucho mejor con el vestido que yo elija, A partir de ahora, tu nombre en este chat cambia, o Quiero ver cómo te esforzás por lucir delicada para mí .</p>
<p>Tono 2: El Contraste de Feminidad (La Burla Elegante). Remarcar la diferencia entre tu femineidad real, perfecta e inalcanzable, y su intento "torpe" de imitarte. Sos solo una copia barata de una mujer, un juguete para mi diversión, o Mirate al espejo, qué sissy tan obediente intentando complacerme .</p>
<p>Tono 3: La Dominante Protectora (Asignación de Roles Seguros). Guiarlo paso a paso. La sissyficación puede generar mucha culpa posterior. Tu rol protector implica estructurar la transformación como tareas divertidas, seguras y estéticas, recordándole que bajo tu mando está bien explorar esa fantasía y que su único debe ser una buena servidora para vos.</p>
<h3>3. Estética, Tareas y Producción Visual</h3>
<p>Este fetiche es sumamente visual y se apoya en el progreso. La creadora no necesita transformarse ella, sino dictar las pautas de la transformación del cliente:</p>
<p>Uso de "Checklists" o Listas de Tareas: Crear manuales o mensajes de texto con los pasos obligatorios que el sumiso debe cumplir: depilación, uso de ropa interior femenina, aprender a maquillarse, pintarse las uñas o usar tacos.</p>
<p>Estética de la Creadora (El Espejo de Elite): Vos debes lucir impecable, ultra femenina o con ropa de autoridad (ejecutiva, látex, lencería de alta gama). Vos sos el ideal estético que ella nunca va a alcanzar, lo que refuerza la asimetría de poder.</p>
<p>Inspecciones Visuales ( Sissy Inspections ): El cliente te envía fotos o videos mostrando su progreso (por ejemplo, cómo le queda el portaligas o el labial que le ordenaste comprar). Vos evaluás el resultado frente a la cámara con una mirada crítica o una sonrisa burlona de aprobación.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Es uno de los nichos con el "Ticket Promedio" (gasto por cliente) más alto de la industria, porque se presta para la venta escalonada:</p>
<p>La "Guía de Transformación" Personalizada donde vas dando las instrucciones por niveles. Nivel 1: Ropa interior oculta bajo su traje de hombre. Nivel 2: Maquillaje básico. Nivel 3: Sumisión total vestida para vos. El cliente paga por desbloquear cada nivel de tu guía.</p>
<p>Venta por Compras Asignadas: Le ordenás al sumiso comprar artículos específicos de tu lista de deseos de Amazon o tronos de propinas (pelucas, lencería, maquillaje) que él mismo tiene que usar para sus reportes en video, además de pagarte la tarifa de revisión del personalizado.</p>
<p>Sissy Penalizaciones Financieras: Si el cliente no se comporta con la delicadeza u obediencia que le exigís, o si habla de forma "demasiado masculino" en el chat, se le aplica una multa económica inmediata en forma de propina para recuperar el derecho a ser tu muñequita.</p>`, orderNum: 4, contentType: 'text' },
    { id: 'les-fet-9', moduleId: 'mod-fet-3', title: 'PEGGING (Penetración y Reversión de Roles)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>Para el hombre que consume o fantasea con el pegging, el atractivo principal no es solo la estimulación física (que anatómicamente conecta con la próstata), sino el quiebre radical de la dominancia masculina tradicional .</p>
<p>Erotización de la sumisión corporal: En la sociedad, el rol del hombre suele asociarse con la penetración y el control. Ceder ese lugar y permitir que su Diosa tome el rol activo e invasivo es el acto de rendición física más explícito que existe.</p>
<p>El placer de la vulnerabilidad extrema: Estar de espaldas o en posiciones vulnerables frente a una mujer armada con un arnés genera una descarga intensa de adrenalina. Para el fan, perder el control de su cuerpo ante tus ojos es liberador y altamente adictivo.</p>
<p>La obsesión por el juguete y el estatus: El strap-on se convierte en un símbolo de tu poder. El suscriptor no ve el juguete como algo artificial; lo ve como una extensión de tu voluntad, de tu autoridad y de tu derecho a poseerlo.</p>
<h3>2. Los Códigos Verbales y de Comportamiento (Cómo manejar el rol)</h3>
<p>El pegging requiere un manejo de chat muy seguro, imponente y sin titubeos. La creadora debe adueñarse por completo del rol activo:</p>
<p>Tono 1: La Propietaria del Control Físico. Hablar con naturalidad sobre el uso del juguete y su cuerpo como algo que te pertenece. Frases como: Te vas a poner en la posición que yo te ordene y vas a aceptar lo que tengo preparado para vos , Ese culo me pertenece, yo decido cuándo y cómo entrar , o Mirá el tamaño de lo que te vas a ganar si te portas bien .</p>
<p>Tono 2: El Desafío al Orgullo Masculino. Recordarle sutilmente la inversión de roles para encender la tensión psicológica: ¿Dónde quedó tu orgullo de hombre ahora que estás de rodillas esperando por mí? , o Te encanta que sea yo la que tiene el control total de la situación.</p>
<p>Tono 3: La Dominante Protectora (Preparación y Guía). El pegging requiere técnica, paciencia e higiene en el mundo real. Tu enfoque protector es fundamental aquí: guiar al cliente en la preparación previa, exigirle el uso de lubricantes adecuados, ir paso a paso en el juego psicológico.</p>
<h3>3. Estética, Herramientas y Producción Visual</h3>
<p>Este fetiche es muy potente a nivel visual y se apoya fuertemente en el equipamiento:</p>
<p>El protagonismo del Arnés/Strap-on: Las producciones de élite muestran el proceso de preparación. Fotos o clips cortos ajustándote el arnés (de cuero, látex o materiales premium), lubricando el consolador frente a la cámara con una mirada fría o desafiante, o probando su flexibilidad.</p>
<p>Combinación de texturas imponentes: Funciona de manera extraordinaria si lo combinás con la estética de Botas bucaneras, corsés, guantes largos de vinilo y el arnés colocado crean una imagen de dominación visualmente imbatible, ahora también podes buscar tu propio estilo, la ropa puede ayudar pero tu autoridad es la que vende.</p>
<p>Ángulos de poder: Filmar desde abajo mientras estás de pie usando el arnés, mirando hacia la lente con superioridad, simulando que el cliente está abajo tuyo asimilando la escena.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Al ser un fetiche que implica una preparación física y visual tan marcada, es ideal para monetizar a través de preventivas y contenido escalonado en el chat privado:</p>
<p>Preparación y Selección: El cliente paga por ver cómo elegis el tamaño, material o color del juguete que usaría en su fantasía, o por un clip exclusivo de vos colocándote el arnés lentamente e interactuando con su nombre, o simplemente fotos en el chat.</p>
<p>Instrucción y Preparación Teórica: Chat, videos o audios donde le dictarás al cliente las reglas obligatorias de preparación física y mental que debe cumplir en su casa antes de que le envíe el video final o antes de una sesión de sexting interactiva.</p>
<p>La Venta del Clímax Visual (Contenido Premium Real o Simulado): Ya sea que hagas contenido sola usando el equipo y dando las órdenes verbales de penetración a la cámara, o que trabajes con creadores/actores secundarios protegiendo tu marca, este contenido se vende como un artículo de lujo absoluto en tu catálogo con precios acordes a la exclusividad del material.</p>`, orderNum: 5, contentType: 'text' },
    { id: 'les-fet-10', moduleId: 'mod-fet-3', title: 'JOI (Instrucciones para masturbarse)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>El éxito del JOI radica en la cesión del ritmo del placer. En una sesión solitaria común, el hombre tiene el control total de su estímulo; en el JOI, renuncia a esa autonomía para entregártela a vos.</p>
<p>Fantasía de compañía y control: El usuario no quiere simplemente ver un cuerpo; Quiere una guía. Sentir que una mujer de élite se toma el tiempo de darle órdenes específicas lo saca de la desconexión de la pornografía común y lo introduce en una experiencia inmersiva y personalizada.</p>
<p>La adrenalina de la obediencia: El suscriptor experimenta un subidón de dopamina al tener que acatar comandos exactos (cuándo tocarse, a qué velocidad, cuándo parar). La obediencia se vuelve el verdadero motor de su excitación.</p>
<p>Romper la gratificación inmediata: Al controlar sus tiempos, dilatas el proceso erótico. Esta acumulación de tensión (edging) hace que el resultado final sea muchísimo más intenso, lo que provoca que el cliente asocie esa experiencia única de clímax directamente con tus órdenes.</p>
<h3>2. Los Códigos Verbales y de Comportamiento</h3>
<p>El JOI es pura cadencia, ritmo y manejo puede adaptarse según tu Alter Ego, pero siempre bajo una estructura de control:</p>
<p>Tono 1: La Directora Implacable / Firme. Comandos secos, claros y dominantes que no permiten discusión. Frases como: Manos arriba, no te di permiso de empezar todavía , Seguí mi ritmo exacto, si te acelerás estás fuera de mi juego , o Mirame a los ojos y detenete ahí. Congelado .</p>
<p>Tono 2: El Enfoque Desafiante o Burlón. Jugar con su resistencia física y mental, ideal para combinar con perfiles de autoridad: Apuesto a que no podés aguantar dos minutos más con mi voz en tu cabeza , o Mirá lo desesperado que estás por cumplir mis órdenes .</p>
<p>Tono 3: La Dominante Protectora (Guía y Sintonía). Conducir al cliente de forma segura y rítmica. Usando una voz pausada, hipnótica y firme para regular su ansiedad, grabándole que estás ahí para moldear su experiencia y exigirle disciplina. Un sumiso guiado con esta precisión no vuelve a consumir contenido genérico nunca más.</p>
<h3>3. Estética, Ritmo y Producción Visual</h3>
<p>El JOI requiere una sincronización visual perfecta con las órdenes que estás dictando:</p>
<p>Planos fijos y contacto visual sostenido ( POV ): La cámara debe estar a la altura de tus ojos. Sostener la mirada hacia la lente de forma fija, es fundamental; el cliente debe sentir que lo estás vigilando atentamente a través de la pantalla.</p>
<p>El uso del lenguaje corporal y las manos: Usar tus propias manos para marcar el ritmo en el aire (marcar la velocidad como un director de orquesta) o señalar la cámara para dar la orden de detenerse.</p>
<p>Estética cuidada y enfoque de texturas: Funciona de forma excelente si vestís lencería premium, medias de red o ropa de oficina, jugando sutilmente con tu ropa o tu cabello mientras dictas los comandos, aumentando la tensión visual sin necesidad de hacer acciones explícitas.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Este fetiche es el rey de la monetización escalonada en el chat privado y permite crear estructuras de precios sumamente lucrativas:</p>
<p>Los Videos por Minuto / Estructura por Niveles: Un video de JOI no se cobra plano. Se cobra por el nivel de complejidad del guion. Podés vender un "JOI Básico" (ritmo estándar), un "JOI de Resistencia" ( Edging/Denial , donde lo mantenés al límite varias veces sin dejarlo terminar) o un "JOI Combinado" (añadiendo códigos de SPH o CEI al final). Cada nivel extra duplica el valor del personalizado.</p>
<p>Venta de Audios JOI de Alta Conversión: Notas de voz en el chat privado simulando una interacción casual pero sumamente firme ("Estoy en mi cama y pensé en decirte exactamente qué tenés que hacer ahora mismo..."). Son rápidos de grabar, no requieren edición visual y se venden de forma masiva como contenido diario para tus suscriptores.</p>
<p>Dinámicas de Sexting Interactivo en Vivo: El JOI es la base perfecta para sesiones de chat de texto o audio en tiempo real, donde cobrarás una tarifa fija por cada 10 minutos de sesión interactiva en la que vas testeando la obediencia del cliente segundo a segundo.</p>`, orderNum: 6, contentType: 'text' },
    { id: 'les-fet-11', moduleId: 'mod-fet-3', title: 'DENIAL (Negación del Orgasmo)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>Para el consumidor de negación , el valor real no está en la liberación física, sino en la intensidad de la tensión acumulada y la sumisión psicológica que esta provoca.</p>
<p>La erotización de la frustración: En el consumo masivo de contenido, la gratificación es inmediata y barata. La negación rompe esta regla por completo. Al prohibir el clímax, el deseo no se apaga; al contrario, se expande y se vuelve una obsesión mental que dura horas o incluso días.</p>
<p>El Orgasmo Aruinado: Muchos sumisos encuentran una descarga psicológica inmensa en que se les ordene arruinar su propio clímax (estimularse hasta el punto de no retorno y parar en seco, o liberar la tensión sin tocarse ni disfrutar del momento). Psicológicamente, esto representa el sacrificio máximo de su placer en honor a tu control.</p>
<p>La dependencia emocional y monetaria: Un sumiso al que se le niega el orgasmo queda biológicamente "enganchado". Su cerebro busca desesperadamente la dopamina que solo vos administras. Esta frustración controlada anula su capacidad de negociación en el chat: se vuelve sumamente dócil y obediente.</p>
<h3>2. Los Códigos Verbales y de Comportamiento</h3>
<p>El manejo de la negación requiere una frialdad absoluta, seguridad y un tono de juego psicológico implacable. No se trata de enojo, se trata de una superioridad calmada:</p>
<p>Tono 1: La Propietaria del Clímax. Establecer que su cuerpo y sus reacciones biológicas no le pertenecen. Frases como: ¿Quién te dio permiso de pensar en terminar?, Tus orgasmos son míos, y hoy decidió que no te lo ganaste, o Vas a quedarte exactamente así, frustrado y pensando en mí toda la noche .</p>
<p>Tono 2: El Placer como un Privilegio Costoso. Tratar la liberación como una recompensa de élite: Tu frustración es lo que me divierte de vos, o Quizás la semana que viene, si tus tributos demuestran verdadera devoción, considera darte permiso .</p>
<p>Tono 3: La Dominante Protectora (Gestión de la Tensión). Monitorear y calibrar el nivel del cliente. La negación prolongada exige disciplina mental por parte del sumiso. Tu rol protector implica guiar esa frustración de manera que se transforma en energía productiva para tu marca (asignándole tareas, rutinas o metas en el chat), enseñándole que la frustración bajo tus órdenes es su mayor muestra de lealtad.</p>
<h3>3. Estética, Ritmo y Producción Visual</h3>
<p>El contenido visual de negación se enfoca en el contraste entre tu sensualidad impecable y tu frialdad verbal:</p>
<p>Estética Premium y Desafiante: Lucir conjuntos de lencería de alta gama, texturas premium o lencería armada que se ve sumamente provocativa. El objetivo visual es maximizar el estímulo del cliente mientras tus palabras le impiden reaccionar severamente.</p>
<p>El Lenguaje Corporal del Bloqueo: Gestos con las manos que indican detenerse, sonrisas burlonas o miradas fijas y divertidas al lente. Sostener un temporizador o mirar el reloj de reojo añade un factor psicológico de presión temporal tremendo.</p>
<p>Clips de "Tease and Denial" (Tensión Directa): Videos cortos o fotos blureadas donde te mostrás sumamente sugerente, elevando su excitación al máximo, para terminar el clip de forma abrupta con una orden directa de apagar la pantalla y quedarse con las ganas.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Es uno de los nichos con mayor retorno económico por mensaje privado, ya que el cliente paga para salir de la tensión o para mantener el juego vivo:</p>
<p>Suscripciones o Packs por "Días de Frustración": Vende un seguimiento en el chat privado donde el cliente paga una tarifa diaria por mantener el estado de negación . Cada mañana entra al chat a reportar que cumplió tu orden de no tocarse.</p>
<p>Customs de "Orgasmo Ruinado" ( Ruined Orgasm Guide ): Videos ultra personalizados donde guías al cliente al punto de no retorno ( edging ) y, en el segundo exacto del clímax, dictás la orden letal de parar o soltar. Este contenido tiene un valor premium elevadísimo debido al nivel de control y precisión verbal que requiere de tu parte.</p>
<p>La Tasa de Redención Financiera: Cuando un sumiso lleva días en castidad o negación y ya no soporta la frustración psicológica, la única manera en que una Goddes concede el permiso para su liberación es a través de una propina o tributo financiero extraordinario. El alivio biológico se convierte en la mercancía más cara de su catálogo.</p>`, orderNum: 7, contentType: 'text' },
    { id: 'les-fet-12', moduleId: 'mod-fet-3', title: 'Fetichismo de pies (Podofilia de Elite)', content: `<p>es, por lejos, el mercado anatómico más masivo, fiel y con mayor flujo de dinero en el mundo del contenido exclusivo.</p>
<p>La ventaja competitiva de este nicho es que es inagotable: podés facturar miles de dólares al mes sin necesidad de recurrir al desnudo explícito, simplemente dominando los códigos visuales y la psicología del suscriptor.</p>
<h3>1. Psicología Profunda del Fan</h3>
<p>Para el devoto de los pies, esta extremidad no es solo una parte del cuerpo; es el eje central de su fijación erótica . Psicológicamente, este fetiche se mueve casi siempre bajo dinámicas de sumisión, entrega y adoración .</p>
<p>El simbolismo de la sumisión: El pie representa el punto más bajo del cuerpo de una mujer. Para el sumiso, colocarse a la altura de tus pies (o por debajo de ellos) es la forma gráfica y física de demostrar su sumisión ante tu autoridad. Adorar tus pies es adorar tu estatus.</p>
<p>Fijación sensorial y pulcritud: El sumiso de pies suele ser un obsevivo extremo. Busca la perfección, el cuidado, la simetría y la limpieza. Para él, un pie bien cuidado transmite elegancia, femineidad real y un nivel de sofisticación que le genera una enorme descarga de dopamina.</p>
<p>El tabú de lo semioculto: A diferencia de otras zonas del cuerpo que siempre están expuestas o hipersexualizadas, el pie tiene ese misterio de lo que suele estar cubierto por zapatos o medias. Acceder a tus planos macro es entrar a tu espacio más íntimo.</p>
<h3>2. Los Códigos Verbales y de Comportamiento</h3>
<p>El manejo de los pies en el FemDom o en el contenido premium exige que la creadora hable con total seguridad y reclame la adoración como un derecho natural:</p>
<p>Tono 1: La Deidad que Exige Adoración. Tratar a tus pies como obras de arte que el cliente solo tiene permitido mirar si paga por el privilegio. Frases como: De rodillas, acá abajo es donde pertenecés, Mirá la perfección de mis plantas, naciste para adorarlas , o Tus ojos no merecen ver más allá de mis tacos .</p>
<p>Tono 2: La Indiferencia Cruel o Burlona. Combinar los pies con el desprecio psicológico : ¿Estás desesperado por besar mis plantas? Primero mostrame qué tan buena es tu billetera, o Sos tan insignificante como el suelo que piso.</p>
<h3>3. Estética, Ángulos y Producción Visual</h3>
<p>En este nicho, la calidad del plano y el cuidado del detalle definen si cobrarás 5 dólares o 100 dólares por una foto:</p>
<p>Higiene y Estética Impecable: Pies ultra hidratados (el uso de aceites corporales para dar brillo es un truco de élite), uñas perfectamente limadas y esmaltadas. Los colores más pedidos son el blanco, negro, rojo profundo y la francesita clásica.</p>
<p>El Diccionario de Planos:</p>
<p>Soles: La planta del pie (plano estrella, enfocado de cerca).</p>
<p>Toes / Scrunching: Los dedos del pie estirados o encogidos con fuerza.</p>
<p>Arcos: El arco del pie, resaltando la curvatura.</p>
<p>Calzado y Texturas: Fotos con tacos aguja ( tacones altos ), sandalias delicadas, o el proceso de deslizar el pie fuera de un zapato ( zapato colgando ). El uso de medias de red o seda multiplica el valor de la producción.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>Es el nicho ideal para la venta diaria y la interacción personalizada en los mensajes privados (DM):</p>
<p>Customs de "Pisotón Visual": Videos donde la creadora filma desde su perspectiva pisando la cámara (protegiendo la lente con un acrílico transparente) usando medias, descalza o con tacos, simulando que está pisando al sumiso.</p>
<p>Venta de Calzado o Medias Usadas: La transición perfecta hacia la logística física. Vende las medias de seda o las sandalias que usas en tus producciones fotográficas, cobrando precios extraordinarios por el empaque discreto y el valor fetichista del objeto real.</p>
<p>El Lado Crudo y Texturado (Pies Sucios y Juanetes)</p>
<p>Hay un mercado gigantesco y sumamente lucrativo que busca exactamente lo opuesto a la pulcritud. Para este tipo de suscriptores, el disparador erótico no es la belleza estética tradicional, sino la autenticidad biológica y la dominación real .</p>
<p>Pies Sucios y Sudorosos: Clientes que pagan fortunas por ver plantas de pies negras después de caminar descalza por la casa, el jardín o la calle, o por medias sudadas después de un día entero usando zapatillas. Psicológicamente, buscan la descarga de sumisión total: adorar el rastro de tu día, el sudor real y la "humillación higiénica" de besar un pie que no se produjo para una foto, sino que está viviendo su realidad.</p>
<p>Juanetes, Dedos Deformes o Imperfecciones: Las llamadas "imperfecciones" anatómicas (juanetes, dedos martillo, cicatrices o curvaturas extrañas) son fetiches hiperespecíficos de nicho. Al haber menos creadoras dispuestas a mostrarlos o que los tengan, el valor de este contenido en el mercado de elite se dispara. Para el fan, esa característica única es el "santo grial" de su obsesión.</p>
<p>Pies con Comida: Una dinámica donde el pie se usa como una herramienta para aplastar, pisar o jugar con texturas (pasteles, frutas, cremas). Mezcla la dominación física con la humillación visual del cliente, que fantasea con ser el receptor de ese desastre.</p>`, orderNum: 8, contentType: 'text' },
    { id: 'les-fet-13', moduleId: 'mod-fet-3', title: 'ADORACIÓN (Worship de Elite)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>El motor de la adoración es el deseo de trascendencia a través de la sumisión . El suscriptor que busca adorar no quiere una interacción casual o de iguales; necesita colocar a la creadora en un pedestal casi divino.</p>
<p>El alivio de la pequeñez: En su vida diaria, el cliente puede tener poder o dinero, pero esa misma posición le exige una carga de frialdad y toma de decisiones constantes. Adorar a su Emperatriz le permite volverse "pequeño", humilde y devoto, experimentando una catarsis psicológica inmensa al arrodillarse ante alguien superior.</p>
<p>La sacralización del fetiche: Cualquier atributo (tus pies, tus manos, tu mirada, tu látex o tu culo) deja de ser una parte del cuerpo y se convierte en un "objeto sagrado". El fan encuentra placer en el respeto, la pulcritud y la distancia litúrgica que impone.</p>
<p>El tributo como ofrenda: Para el adorador, el dinero cambia de significado. Ya no es un pago por un servicio; es un tributo de devoción . Pagar es su forma de rezar, su manera de demostrar que es digno de que le prestes atención.</p>
<h3>2. Los Códigos Verbales y de Comportamiento</h3>
<p>La adoración exige que la creadora se cree el papel al 100%. Tu lenguaje debe ser impecable, distante pero magnético, encarnando a la Dominante Protectora que acepta la devoción si el sumiso se comporta a la altura:</p>
<p>Tono 1: Distante e Imponente. Hablar desde el trono, aceptando los halagos como algo que te corresponde por derecho. Frases como: Acepto tu devoción, pero tus palabras deben venir acompañadas de hechos , Mirame bien, naciste para contemplar mi perfección desde el suelo , o Tu único propósito en este chat es recordar lo superior que soy .</p>
<p>Tono 2: La Exigencia (Límites de Elite). Educar al cliente en cómo debe dirigirse a vos. No se permite la confianza ordinaria: Para hablarle a tu Diosa, primero debes presentarte con un tributo de respeto , o Cuidá tus palabras en mi presencia; la adoración requiere disciplina .</p>
<p>Tono 3: La Dominante Protectora (Validación del Culto). El fan de la adoración es sumamente fiel, pero necesita saber que su devoción es bien recibida. Tu enfoque protector implica darle ese espacio seguro donde su culto es validado, guiándolo para que su sumisión sea sana, productiva y completamente enfocada en enaltecer tu marca.</p>
<h3>3. Estética, Atmósfera y Producción Visual</h3>
<p>Para vender adoración, el entorno visual debe transmitir lujo, poder y misticismo. No es una selfie rápida en el sillón; es una puesta en escena:</p>
<p>Estética de Trono y Realeza: Uso de sillas imponentes (estilos ejecutivos altos o sillones de terciopelo), iluminación dramática con contrastes fuertes, y fondos limpios o atractivos. Vestuarios de alta gama: vestidos elegantes, corsés de satén, cuero impecable o lencería armada de élite con joyería llamativa.</p>
<p>Ángulos de Superioridad Absoluta: Filmar siempre con la cámara baja, apuntando hacia arriba, de modo que obliga visualmente al espectador a mirarte desde abajo. Tu mirada debe ser directa, firme, serena y segura de tu poder.</p>
<p>Rituales Visuales: Clips cortos enfocados en un solo atributo. Por ejemplo, un video en silencio o con música ambiental donde solo mostrarás el movimiento delicado de tus manos con anillos, o la quietud de tus pies con tacos sobre una alfombra, invitando al sumiso a la contemplación silenciosa.</p>
<h3>4. Estrategia de Venta en el Chat y Contenido "Personalizado"</h3>
<p>La adoración es el nicho con el mayor margen de ganancia limpia de la industria, porque el contenido "custom" se estructura bajo la lógica del tributo y el acceso escalonado:</p>
<p>El Protocolo de Entrada: Implementar en tus chats la regla de que ningún cliente nuevo puede iniciar una conversación sin antes enviar un "Tributo de Apertura". Si el cliente no paga para presentarse ante la Diosa, no se le responde. Esto filtra a los curiosos y atrae de inmediato a los verdaderos adoradores.</p>
<p>Customs de Adoracion: tareas personalizados donde la creadora, envia tareas al sumiso y vos dictás si su devoción es aceptada en tu corte o si necesitas esforzarse más económicamente para ganarse tu bendición.</p>
<p>Packs de Contemplación Exclusiva: Compilación galerías fotográficas y de video de altísima calidad artística enfocadas puramente en la estética de tu Alter Ego (tu rostro, tus miradas, tus manos, tu presencia corporativa), vendidas a precios premium bajo el concepto de que son "reliquias visuales" reservadas solo para los siervos más fieles de tu comunidad VIP.</p>`, orderNum: 9, contentType: 'text' },
    { id: 'les-fet-14', moduleId: 'mod-fet-3', title: 'FINDOM (Dominación Financiera)', content: `<h3>1. Psicología Profunda del Fan</h3>
<p>El esclavo financiero (cerdito pagador) no paga por recibir un servicio, una foto o un video; su orgasmo y su liberación erótica ocurren en el momento exacto en que transfiere el dinero .</p>
<p>Erotización de la pérdida y la escasez: Para el hombre en el mundo real, el dinero es el símbolo máximo de su poder, estatus y seguridad. Entregar ese dinero de forma voluntaria a su Emperatriz es el acto de sumisión más destructivo y placentero para su ego. Disfruta de la sensación de quedar desprotegido ante tu voluntad.</p>
<p>El dinero como extensión de su tiempo: El sumiso financiero entiende que el dinero representa las horas de su vida que pasó trabajando. Al entregártelo, te está regalando literalmente su tiempo de vida y su esfuerzo, convirtiéndose en un servidor en el sentido más puro del término.</p>
<p>La adicción al tributo inmediato ( Goddess Worship ): El sumiso busca la validación instantánea. Ver cómo aceptarás su tributo (o cómo lo ignorarás de forma fría tras recibirlo) le genera una descarga de adrenalina inmensa que la pornografía común.</p>
<h3>2. Los Códigos Verbales y de Comportamiento</h3>
<p>El Findom es pura actitud de superioridad absoluta, codicia elegante y desprecio financiero. La creadora no pide, exige o reclama lo que considera suyo por derecho :</p>
<p>Tono 1: La Dueña de su Billetera (Derecho Natural). Hablar del dinero del cliente como si fuera tuyo y él solo lo estaría cuidando temporalmente. Frases como: Tu billetera me pertenece, mostrame qué tan buen esclavo sos hoy , Ese dinero luce mucho mejor en mi cuenta que en la tuya , o Tu único valor en mi chat es tu capacidad de tributar .</p>
<p>Tono 2: La Indiferencia Financiera / El Desprecio. Castigar o ignorar si el monto no está a la altura de tu estatus. Esto enciende su deseo de esforzarse más: ¿Eso es todo lo que vale tu devoción? Patético , o Volvé cuando tengas un tributo real que merezca mi atención .</p>
<p>Tono 3: El Enfoque de Elite (Establecer el Filtro). En el Findom real no se ruega ni se persigue al cliente. La creadora se posiciona tan alto que el esclavo financiero siente que transferir dinero es el único privilegio disponible para que tus notas su existencia.</p>
<h3>3. Estética, Herramientas y Dinámicas Digitales</h3>
<p>A diferencia de otros nichos corporales, el Findom se apoya visualmente en las transacciones, las marcas de lujo y el estilo de vida de la creadora:</p>
<p>Estética de Lujo y Poder: Muestra un estilo de vida aspiracional. Fotos usando ropa de diseñador, accesorios costosos o simplemente disfrutando de un café premium. El mensaje visual es claro: Tu dinero financiero mi perfección .</p>
<p>Capturas de Pantalla: El contenido visual secundario en este nicho son las capturas de las transferencias recibidas (difuminando los datos del cliente). Publicar que otros están tributando genera un efecto de competencia brutal ( Drain ) entre los sumisos; todos quieren ser el que mandó la propina más alta para ganar tu mención.</p>
<p>Uso de Herramientas de Desgaste ( Draining ): Crear dinámicas interactivas de billetera como juegos de dados financieros, "tributos por respirar" (el cliente paga una tarifa fija por cada hora que pasa en tu chat), o metas de propinas grupales para desbloquear un beneficio común.</p>
<h3>4. Estrategia de Venta en el Chat y Dinámicas de Pago</h3>
<p>En el Findom, el chat privado es el campo de juego donde se ejecuta el vaciado de cuentas ( Draining ):</p>
<p>La Tasa de Mensaje Privado: Una regla estricta en el Findom es que el sumiso debe adjuntar una propina con cada mensaje de texto que envía en el chat privado. Si el mensaje llega sin dinero, se borra o se ignora por completo. El cliente paga por el derecho de ser escuchado por su Ama.</p>
<p>Sesiones de Vaciado Colectivo: Dinámicas de chat o vivos de tiempo limitado donde exiges tributos en ráfaga (por ejemplo: “Tienen 5 minutos para llenar esta meta de propinas). Los sumisos entran en un estado de euforia y compiten entre ellos para mantenerte feliz.</p>
<p>Tributos Silenciosos: Sumisos de alto valor que transfieren montos fijos semanales o mensuales de forma automática, sin exigir fotos, videos ni conversación a cambio. Su único placer es saber que están financiando tu estilo de vida y que vos aceptas su dinero desde tu trono.</p>`, orderNum: 10, contentType: 'text' },
    { id: 'les-fet-15', moduleId: 'mod-fet-3', title: 'Nota Final: Autenticidad, Estilo y Comodidad', content: `<p>Como creadora y mentora, necesito que te grabes a fuego una regla de oro antes de invertir un solo centavo en vestuario o de aceptar dinámicas que te generen ansiedad: El fetiche se adapta a vos, no vos al fetiche.</p>
<h3>1. El Mito de la Ropa "Obligatoria</h3>
<p>Existe el error garrafal de creer que para dominar o trabajar en estos nichos necesitás transformarte obligatoriamente en una figura fría vestida de cuero negro de pies a cabeza. Eso es completamente falso. * La ropa de cuero, vinilo o látex no es exclusiva de un papel rígido. Podés usarla con una estética totalmente Bratty (esa vibra de chica caprichosa, juguetona, desafiante y demandante) o adaptarla a un estilo urbano, elegante o casual.</p>
<p>Lo verdaderamente importante es ser fiel a tu propia personalidad . Si intentás forzar un personaje frío cuando en realidad sos más expresiva, juguetona o protectora, el cliente va a notar la falsedad de inmediato. En el mercado premium, la falta de autenticidad mata la venta . El sumiso busca conectarse con una esencia real, no con una actriz barata que repite un guion.</p>
<h3>2. Tus Límites son tu Mayor Fortaleza</h3>
<p>Otra gran mentira de la industria es que para facturar fuerte estás obligado a hacer videollamadas en vivo o enviar audios personalizados todo el tiempo.</p>
<p>Quiero que te quedes completamente tranquila: No hace falta que expongas tu voz o tu tiempo en vivo si no te sentís cómoda al hacerlo. Podés construir un imperio digital manejando absolutamente todo a través de chats de texto estructurados, guiones escritos y contenido pregrabado en fotos y videos.</p>
<p>Es obvio y realista saber que las videollamadas y los audios directos son herramientas de monetización rápida que aumentan el valor del ticket y te hacen ganar más plata en menos tiempo. Pero de nada sirve ofrecerlos si vas a estar incómodo, nervioso o desconectado durante la sesión.</p>
<p>Tu comodidad es tu principal activo de marketing. Cuando vos trabajas bajo tus propias reglas, en paz y disfrutando de tu autoridad, esa seguridad se refleja en la pantalla . Es justamente esa tranquilidad e integridad lo que te permite conectar de forma profunda y real con el sumiso, haciendo que él respete tus límites y se vuelva un cliente fiel a largo plazo.</p>
<p>Tu negocio, tus reglas, tu comodidad.</p>`, orderNum: 11, contentType: 'text' },
    { id: 'les-fet-16', moduleId: 'mod-fet-4', title: 'El Filtro Práctico: El Embudo de Conversión Rápida (Regla de los 3 Mensajes)', content: `<p>Olvidate de exigir un tributo obligatorio solo para que el cliente pueda abrir el chat; en el día a día de las plataformas, eso no funciona y congela tus ventas. El cliente necesita morder el anzuelo antes de sacar la billetera.</p>
<p>Tu estrategia en el privado consiste en engancharlo rápido y cerrar la venta en un máximo de 3 mensajes , usando el fetiche del cliente a tu favor:</p>
<p>Mensaje 1 (La Recepción y Filtro): Recibís al cliente manteniendo tu esencia y tu autoridad. Le preguntás directamente qué fetiche o contenido lo trajo a tu privado hoy.</p>
<p>Mensaje 2 (El Enganche / Iniciar el Juego): Cuando te confiesa su fetiche, lo metés adentro del juego inmediatamente . Le respondés con una frase corta, sencilla y contundente usando ese fetiche, para que experimente tu poder en tiempo real y se quede enganchado.</p>
<p>Mensaje 3 (La Oferta y Cierre): Ahora que ya está adentro del rol y con la cabeza volada, le ofrecés el servicio pago exacto que corresponde a su fetiche para que deje su dinero.</p>
<p>Ejemplos Reales de Aplicación (Mensaje 2 y 3):</p>
<p>Si te dice SPH (Humillación): * Mensaje 2: Le tirás una burla corta y sutil sobre su masculinidad.</p>
<p>Mensaje 3: Le ofrecés calificarlo de forma oficial a cambio de su pago, o una tarea humillante.</p>
<p>Si te dice Castidad: * Mensaje 2: Le recordás de forma firme que su placer ahora depende de vos.</p>
<p>Mensaje 3: Le ofrecés el servicio de ser su Keyholder (Guardiana de la llave) bajo una tarifa fija.</p>
<p>Si te dice Sissyficación (Feminización): * Mensaje 2: Le das una pequeña orden tratándolo en femenino.</p>
<p>Mensaje 3: Le vendés una Orden de Humillación o un guion escrito premium para que comience su transformación.</p>
<p>Si después del Mensaje 3 el tipo sigue dando vueltas o intentando charlar gratis, se terminó el juego y se corta la interacción. El tiempo es dinero.</p>`, orderNum: 1, contentType: 'text' },
    { id: 'les-fet-17', moduleId: 'mod-fet-4', title: 'El Proceso de Cierre en 3 Pasos (Sin rogar, sin presionar)', content: `<p>Para vender contenido personalizado o packs temáticos de alto valor, tenés que mantener el control del ritmo de la venta. El proceso se estructura en tres pasos limpios:</p>
<p>Paso A: Calificación (Detectar el fetiche y el presupuesto)</p>
<p>No le ofrezcas todo tu menú de golpe. Hacé que él confiese qué es lo que busca. El sumiso disfruta de la vulnerabilidad de admitir su fetiche ante tu autoridad.</p>
<p>Pregunta de Control: "¿Qué fantasía viniste a rendir ante mí hoy? Sé específico. Quiero saber exactamente qué te obsesiona."</p>
<p>Paso B: La Propuesta de Elite (Crear valor antes de dar el precio)</p>
<p>Cuando le des las opciones, no hables de "un video de 5 minutos". Hablá de la experiencia psicológica que va a vivir contigo. Vendé el control, la intensidad y tu presencia.</p>
<p>Estructura de Venta: "Tengo preparado para vos un clip personalizado de JOI y SPH de 5 minutos, filmado en plano POV, donde voy a desarmar tu orgullo y marcarte el ritmo de forma implacable usando tu nombre. Te va a costar [X] dólares".</p>
<p>Paso C: Cierre Inapelable</p>
<p>Una vez que tirás el precio, te quedarás en silencio (o deja de escribir). El primero que habla, pierde. Si el cliente empieza a dar vueltas oa pedir rebajas, se le corta el acceso de inmediato. El valor de una Emperatriz no se negocia.</p>`, orderNum: 2, contentType: 'text' },
    { id: 'les-fet-18', moduleId: 'mod-fet-4', title: 'El Fin del \"Roleplay Gratis\": Valoriza tu Tiempo', content: `<p>Muchos sumisos intentan camuflar una sesión de sexting o dominación verbal dentro de la charla del chat, enviándote mensajes largos describiendo lo que te harían o cómo se arrodillarían, esperando que vos les respondas en el mismo tono.</p>
<p>Identificá la trampa: Si le respondes el juego de forma dominante por texto sin que haya pagado, ya le diste el estímulo que buscaba gratis. Se va a ir a dormir feliz sin dejarte un centavo.</p>
<p>Cómo frenarlo y monetizarlo: Corta el roleplay en seco y lo transformás en una oferta de sesión paga.</p>
<p>"Estás intentando disfrutar de mi autoridad de forma gratuita y eso es una falta de respeto a tu diosa. Si quieres mis órdenes en tiempo real, la tarifa es de $.... Enviá el tributo ahora o salí de mi vista."</p>`, orderNum: 3, contentType: 'text' },
    { id: 'les-fet-19', moduleId: 'mod-fet-4', title: 'Gestión del Tiempo: Presencia y Velocidad de Respuesta ( La Venta en Caliente )', content: `<p>Olvidate del mito de que hacerte desear y tardar horas en responder te hace ver más importante frente a un cliente nuevo. En las plataformas, tiempo es dinero y la velocidad de respuesta factura .</p>
<p>El momento es AHORA: El sumiso que entra a tu privado y te escribe está en su momento de máxima excitación y quiere interactuar ya. Si estás en línea y le respondés de inmediato, aprovechás ese impulso biológico para engancharlo con la regla de los 3 mensajes y cerrás la venta antes de que se enfríe. Si no estás vos para responderle, hay miles de creadoras más en línea dispuestas a sacar la plata.</p>
<p>El castigo de la indiferencia es para los fieles: El juego psicológico de ignorar mensajes, tardar en responder o aplicar "silencios dominantes" es una estrategia avanzada que solo vas a usar con tus sumisos fidelizados . A ellos sí los podés hacer esperar porque ya están obsesionados con tu Alter Ego y esa espera les genera más sumisión. Al cliente que recién entra al embudo, se le responde rápido, se lo mete en el juego y se le cobra.</p>
<p>Has llegado al final de este manual, pero este no es el destino; es apenas el punto de partida. Ahora tenés en tus manos la radiografía psicológica de los fetiches más lucrativos del mercado y la ingeniería de chat exacta que utiliza la élite digital para facturar a lo grande. El conocimiento ya es tuyo.</p>
<p>Sin embargo, quiero que recuerdes algo fundamental: la información sin ejecución no genera billetes .</p>
<p>El mercado está lleno de creadores que saben qué es un fetiche, pero muy pocos tienen la disciplina, la velocidad de respuesta y el carácter para cobrar lo que realmente vale su tiempo. La diferencia entre ellas y vos es que a partir de hoy, vos operas con mentalidad de empresaria. No vas a rogar, no vas a regalar interacciones gratis y no vas a dudar al poner tus precios.</p>
<p>Tu personaje está listo, tu privacidad está ciega y el privado de tus plataformas es tu oficina de alta gama. Entrá con la espalda recta, hablá con la seguridad de quien se sabe dueña del juego y hacé valer cada segundo de tu presencia.</p>
<p>El mercado de élite tiene el dinero listo. Salí ahí afuera, toma el control de sus fantasías y reclamará el trono que te pertenece.</p>`, orderNum: 4, contentType: 'text' },
  ]

  for (const l of lessonsData) {
    await db.execute({
      sql: `INSERT INTO lessons (id, module_id, title, content_type, content, order_num) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [l.id, l.moduleId, l.title, l.contentType, l.content, l.orderNum]
    })
  }

  return { modules: modules.length, lessons: lessonsData.length }
}

export async function seedAdmin() {
  const db = getDb()
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@dinastyacademy.com'

  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE email = ?',
    args: [adminEmail]
  })

  if (existing.rows.length === 0) {
    const bcrypt = await import('bcryptjs')
    const passwordHash = await bcrypt.hash('Dinasty2026!', 10)
    const id = crypto.randomUUID()
    await db.execute({
      sql: `INSERT INTO users (id, email, password_hash, name, role, active) VALUES (?, ?, ?, ?, 'admin', 1)`,
      args: [id, adminEmail, passwordHash, 'Admin']
    })
    return { id, email: adminEmail, created: true }
  }

  return { id: existing.rows[0].id, email: adminEmail, created: false }
}

// ─── Course Pricing Helpers ──────────────────────────────

const DEFAULT_PRICING: {
  course: string
  ars_amount: number
  ars_strike: number | null
  usd_amount: number
  usd_strike: number | null
  mp_link: string | null
  binance_id: string | null
  binance_instructions: string | null
  is_featured: number
  badge_text: string | null
}[] = [
  {
    course: 'reddit',
    ars_amount: 25000,
    ars_strike: 60000,
    usd_amount: 35,
    usd_strike: 90,
    mp_link: null,
    binance_id: null,
    binance_instructions: null,
    is_featured: 1,
    badge_text: 'SUPER GOLD',
  },
  {
    course: 'onlyfans',
    ars_amount: 15000,
    ars_strike: 50000,
    usd_amount: 25,
    usd_strike: 80,
    mp_link: null,
    binance_id: null,
    binance_instructions: null,
    is_featured: 0,
    badge_text: null,
  },
  {
    course: 'hombres',
    ars_amount: 15000,
    ars_strike: 50000,
    usd_amount: 25,
    usd_strike: 80,
    mp_link: null,
    binance_id: null,
    binance_instructions: null,
    is_featured: 0,
    badge_text: null,
  },
  {
    course: 'fetiches',
    ars_amount: 25000,
    ars_strike: 60000,
    usd_amount: 35,
    usd_strike: 90,
    mp_link: null,
    binance_id: null,
    binance_instructions: null,
    is_featured: 1,
    badge_text: 'PREMIUM',
  },
]

async function seedDefaultPricing() {
  const db = getDb()
  for (const p of DEFAULT_PRICING) {
    try {
      const existing = await db.execute({
        sql: 'SELECT course FROM course_pricing WHERE course = ?',
        args: [p.course],
      })
      if (existing.rows.length === 0) {
        await db.execute({
          sql: `INSERT INTO course_pricing (course, ars_amount, ars_strike, usd_amount, usd_strike, mp_link, binance_id, binance_instructions, is_featured, badge_text)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [p.course, p.ars_amount, p.ars_strike, p.usd_amount, p.usd_strike, p.mp_link, p.binance_id, p.binance_instructions, p.is_featured, p.badge_text],
        })
      }
    } catch (e) {
      // ignore duplicates
    }
  }
}

export interface CoursePricing {
  course: string
  arsAmount: number
  arsStrike: number | null
  usdAmount: number
  usdStrike: number | null
  mpLink: string | null
  binanceId: string | null
  binanceInstructions: string | null
  isFeatured: boolean
  badgeText: string | null
}

export async function getAllPricing(): Promise<CoursePricing[]> {
  const db = getDb()
  const result = await db.execute('SELECT * FROM course_pricing ORDER BY is_featured DESC, course ASC')
  return result.rows.map(r => ({
    course: r.course as string,
    arsAmount: r.ars_amount as number,
    arsStrike: r.ars_strike as number | null,
    usdAmount: r.usd_amount as number,
    usdStrike: r.usd_strike as number | null,
    mpLink: r.mp_link as string | null,
    binanceId: r.binance_id as string | null,
    binanceInstructions: r.binance_instructions as string | null,
    isFeatured: Boolean(r.is_featured),
    badgeText: r.badge_text as string | null,
  }))
}

export async function getPricingByCourse(course: string): Promise<CoursePricing | null> {
  const db = getDb()
  const result = await db.execute({
    sql: 'SELECT * FROM course_pricing WHERE course = ?',
    args: [course],
  })
  if (result.rows.length === 0) return null
  const r = result.rows[0]
  return {
    course: r.course as string,
    arsAmount: r.ars_amount as number,
    arsStrike: r.ars_strike as number | null,
    usdAmount: r.usd_amount as number,
    usdStrike: r.usd_strike as number | null,
    mpLink: r.mp_link as string | null,
    binanceId: r.binance_id as string | null,
    binanceInstructions: r.binance_instructions as string | null,
    isFeatured: Boolean(r.is_featured),
    badgeText: r.badge_text as string | null,
  }
}

export async function updatePricing(course: string, data: {
  arsAmount?: number
  arsStrike?: number | null
  usdAmount?: number
  usdStrike?: number | null
  mpLink?: string | null
  binanceId?: string | null
  binanceInstructions?: string | null
  isFeatured?: boolean
  badgeText?: string | null
}) {
  const db = getDb()
  const fields: string[] = []
  const args: (string | number | null)[] = []

  if (data.arsAmount !== undefined) { fields.push('ars_amount = ?'); args.push(data.arsAmount) }
  if (data.arsStrike !== undefined) { fields.push('ars_strike = ?'); args.push(data.arsStrike) }
  if (data.usdAmount !== undefined) { fields.push('usd_amount = ?'); args.push(data.usdAmount) }
  if (data.usdStrike !== undefined) { fields.push('usd_strike = ?'); args.push(data.usdStrike) }
  if (data.mpLink !== undefined) { fields.push('mp_link = ?'); args.push(data.mpLink) }
  if (data.binanceId !== undefined) { fields.push('binance_id = ?'); args.push(data.binanceId) }
  if (data.binanceInstructions !== undefined) { fields.push('binance_instructions = ?'); args.push(data.binanceInstructions) }
  if (data.isFeatured !== undefined) { fields.push('is_featured = ?'); args.push(data.isFeatured ? 1 : 0) }
  if (data.badgeText !== undefined) { fields.push('badge_text = ?'); args.push(data.badgeText) }

  if (fields.length === 0) return getPricingByCourse(course)

  fields.push("updated_at = datetime('now')")
  args.push(course)

  await db.execute({
    sql: `UPDATE course_pricing SET ${fields.join(', ')} WHERE course = ?`,
    args,
  })

  return getPricingByCourse(course)
}

// ─── Editor de fotos con IA ──────────────────────────────────

export const EDITOR_DAILY_LIMIT_DEFAULT = 20

export async function getEditorDailyLimit(): Promise<number> {
  const db = getDb()
  try {
    const result = await db.execute({
      sql: `SELECT value FROM editor_config WHERE key = 'daily_limit'`,
      args: []
    })
    const val = (result.rows[0] as any)?.value
    if (val === 'unlimited' || val === '-1' || val === '∞') return -1
    const n = Number(val)
    if (!isNaN(n) && n >= 0) return n
    return EDITOR_DAILY_LIMIT_DEFAULT
  } catch {
    return EDITOR_DAILY_LIMIT_DEFAULT
  }
}

export async function setEditorDailyLimit(limit: number) {
  const db = getDb()
  const value = limit < 0 ? 'unlimited' : String(limit)
  await db.execute({
    sql: `INSERT INTO editor_config (key, value, updated_at) VALUES ('daily_limit', ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
    args: [value]
  })
  return getEditorDailyLimit()
}

export async function getEditorUsageToday(userId: string): Promise<number> {
  const db = getDb()
  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM editor_usage
          WHERE user_id = ?
            AND created_at >= date('now')`,
    args: [userId]
  })
  return Number((result.rows[0] as any)?.count ?? 0)
}

export async function recordEditorUsage(userId: string, mode: string, prompt: string) {
  const db = getDb()
  const id = crypto.randomUUID()
  await db.execute({
    sql: `INSERT INTO editor_usage (id, user_id, mode, prompt) VALUES (?, ?, ?, ?)`,
    args: [id, userId, mode, prompt]
  })
}

export async function getEditorStats() {
  const db = getDb()
  const total = await db.execute(`SELECT COUNT(*) as count FROM editor_usage`)
  const today = await db.execute(`SELECT COUNT(*) as count FROM editor_usage WHERE created_at >= date('now')`)
  const byMode = await db.execute(`
    SELECT mode, COUNT(*) as count
    FROM editor_usage
    GROUP BY mode
    ORDER BY count DESC
  `)
  const byUser = await db.execute(`
    SELECT u.email, u.name, COUNT(e.id) as count, MAX(e.created_at) as last_used
    FROM editor_usage e
    JOIN users u ON u.id = e.user_id
    GROUP BY u.id
    ORDER BY count DESC
    LIMIT 20
  `)
  return {
    total: Number((total.rows[0] as any)?.count ?? 0),
    today: Number((today.rows[0] as any)?.count ?? 0),
    byMode: byMode.rows,
    byUser: byUser.rows,
  }
}
