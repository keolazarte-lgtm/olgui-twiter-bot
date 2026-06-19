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

export async function getAllUsers() {
  const db = getDb()
  const result = await db.execute('SELECT * FROM users ORDER BY created_at DESC')
  return result.rows
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
    { id: 'mod-1', title: 'Mentalidad, Preparación y Legado', description: 'De mujer a mujer: cómo superar los miedos, protegerte y construir tu imperio desde cero. Con o sin rostro.', order_num: 1, icon: 'Brain', is_alert: 0 },
    { id: 'mod-alerta-of', title: 'ALERTA ROJA: Reglas de OnlyFans y Cuidado de tu Cuenta', description: 'El mayor error de un creador novato es no leer los términos y condiciones. OnlyFans no da segundas oportunidades: leé esto ANTES de seguir.', order_num: 2, icon: 'AlertTriangle', is_alert: 1 },
    { id: 'mod-2', title: 'De Cero a Creadora: Creación y Verificación', description: 'Creá tu cuenta de OnlyFans paso a paso, activá el modo creadora y verificá tu identidad sin errores ni rechazos.', order_num: 3, icon: 'Lock', is_alert: 0 },
    { id: 'mod-3', title: 'El Panel de Control: Tu Centro de Mandos', description: 'Tus primeros ajustes, el menú desplegable completo y la sección especial de retiro de dinero. Cómo cobrar tus dólares.', order_num: 4, icon: 'Shield', is_alert: 0 },
    { id: 'mod-4', title: 'La Barra de Herramientas', description: 'Todos los íconos y funciones para armar tus publicaciones de forma profesional. Imágenes, videos, encuestas y más.', order_num: 5, icon: 'DollarSign', is_alert: 0 },
    { id: 'mod-5', title: 'Perfil e Identidad de Alto Valor', description: 'Nombre artístico, foto de perfil, portada, biografía, cuenta gratis y mensaje de bienvenida automatizado.', order_num: 6, icon: 'UserCheck', is_alert: 0 },
    { id: 'mod-6', title: 'Guía de Tarifas', description: 'Estrategia de venta dinámica — Tarifas de bóveda, contenido personalizado y servicios en tiempo real.', order_num: 7, icon: 'Banknote', is_alert: 0 },
    { id: 'mod-7', title: 'Cómo obtener tus primeros suscriptores', description: 'Promoción cruzada, redes de tráfico orgánico y estrategias para arrancar con ventas desde el día uno.', order_num: 8, icon: 'Flame', is_alert: 0 },
  ]

  for (const m of modules) {
    await db.execute({
      sql: `INSERT INTO modules (id, title, description, order_num, icon, is_alert) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [m.id, m.title, m.description, m.order_num, m.icon, m.is_alert]
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

export const EDITOR_DAILY_LIMIT = 20

export async function getEditorUsageToday(userId: string): Promise<number> {
  const db = getDb()
  // SQLite stores datetime('now') in UTC; we count since 00:00 UTC of today
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
