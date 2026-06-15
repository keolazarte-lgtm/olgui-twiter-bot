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
      mp_payment_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  await db.execute(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      order_num INTEGER,
      icon TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

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

// ─── Seed Helpers ─────────────────────────────────────────

export async function seedModules() {
  const db = getDb()

  // Delete existing modules and lessons to re-seed with updated content
  await db.execute('DELETE FROM lessons')
  await db.execute('DELETE FROM modules')

  const modules = [
    { id: 'mod-1', title: 'Mentalidad y Preparación de Alto Valor', description: 'Conceptos clave de la industria, mindset de élite y preparación tecnológica. De amateur a dueña de negocio.', order_num: 1, icon: 'Brain' },
    { id: 'mod-2', title: 'Registro y Verificación de Identidad', description: 'Creación de cuenta, activación de cuenta creadora y paso a paso para la verificación sin errores.', order_num: 2, icon: 'Lock' },
    { id: 'mod-3', title: 'El Panel de Control: Tu Centro de Mandos', description: 'Tus primeros ajustes, menú desplegable y sección especial de retiro de dinero. Cómo cobrar tus dólares.', order_num: 3, icon: 'Shield' },
    { id: 'mod-4', title: 'La Barra de Herramientas', description: 'Cómo armar tus publicaciones de forma profesional y atractiva para maximizar tus ventas.', order_num: 4, icon: 'DollarSign' },
    { id: 'mod-5', title: 'Perfil e Identidad de Alto Valor', description: 'Foto de portada, biografía, tips de cuenta free y mensaje de bienvenida automatizado.', order_num: 5, icon: 'UserCheck' },
    { id: 'mod-6', title: 'Cómo obtener tus primeros suscriptores desde cero', description: 'Estrategias de tráfico y difusión para arrancar con ventas desde el día uno.', order_num: 6, icon: 'Banknote' },
  ]

  for (const m of modules) {
    await db.execute({
      sql: `INSERT INTO modules (id, title, description, order_num, icon) VALUES (?, ?, ?, ?, ?)`,
      args: [m.id, m.title, m.description, m.order_num, m.icon]
    })
  }

  const lessonsData: { id: string; moduleId: string; title: string; content: string; orderNum: number; contentType: string }[] = [
    // Module 1
    { id: 'les-1-1', moduleId: 'mod-1', title: 'Conceptos clave de la industria y mercado internacional', content: '<h2>Conceptos clave de la industria</h2><p>La industria del contenido para adultos mueve miles de millones de dólares anualmente a nivel mundial. OnlyFans es la plataforma líder, pero no la única. Entender cómo funciona este mercado es el primer paso para convertirte en una creadora exitosa.</p><h3>El mercado internacional</h3><p>Tus suscriptores potenciales están en todo el mundo. El dólar es tu moneda de referencia, y lo que cobrás en USD se multiplica cuando lo convertís a pesos.</p><h3>Conceptos fundamentales</h3><ul><li><strong>Suscripción mensual:</strong> Ingreso recurrente que cobrás cada mes</li><li><strong>PPV (Pay Per View):</strong> Contenido exclusivo que cobrás aparte</li><li><strong>Tips:</strong> Propinas voluntarias de tus suscriptores</li><li><strong>Referrals:</strong> Comisión por referir a otras creadoras</li></ul>', orderNum: 1, contentType: 'text' },
    { id: 'les-1-2', moduleId: 'mod-1', title: 'Mindset de élite: De creadora amateur a dueña de negocio', content: '<h2>Mindset de élite</h2><p>El error más común de las creadoras es tratarse como empleadas en vez de como empresarias. Vos sos la dueña de tu negocio, y eso cambia todo.</p><ul><li>Invertí en tu negocio: herramientas, contenido, marketing</li><li>Trabajá de forma estratégica, no reactiva</li><li>Diversificá tus fuentes de ingreso</li><li>Planificá a largo plazo</li><li>Automatizá todo lo que puedas</li></ul>', orderNum: 2, contentType: 'text' },
    { id: 'les-1-3', moduleId: 'mod-1', title: 'Preparación tecnológica y correos electrónicos blindados', content: '<h2>Preparación tecnológica</h2><p>Antes de crear tu cuenta, necesitás tener tu infraestructura tecnológica lista.</p><h3>Email blindado</h3><p>Creá un email dedicado exclusivamente para tu cuenta de OnlyFans. Recomendamos usar ProtonMail o Tutanota para máxima privacidad.</p><h3>Checklist de preparación</h3><ul><li>Email nuevo y privado (ProtonMail recomendado)</li><li>Nombre de usuario que no revele tu identidad</li><li>VPN activa al acceder a la plataforma</li><li>Número de teléfono nuevo o virtual para verificación</li><li>Cuenta bancaria o billetera virtual para cobrar</li></ul>', orderNum: 3, contentType: 'text' },

    // Module 2
    { id: 'les-2-1', moduleId: 'mod-2', title: 'Creación de cuenta inicial básica', content: '<h2>Creando tu cuenta de OnlyFans</h2><p>El proceso de registro es sencillo pero hay detalles importantes para proteger tu privacidad.</p><ol><li>Ingresá a onlyfans.com y hacé clic en "Sign Up"</li><li>Usá tu email blindado</li><li>Elegí un nombre de usuario que no tenga relación con tu identidad real</li><li>Creá una contraseña fuerte y única</li><li>Completá la verificación por email</li></ol><p><strong>Importante:</strong> No uses tu nombre real ni información que pueda vincularte con tu identidad personal.</p>', orderNum: 1, contentType: 'text' },
    { id: 'les-2-2', moduleId: 'mod-2', title: 'Activación de cuenta creadora', content: '<h2>Activación de cuenta creadora</h2><p>Una vez que tenés tu cuenta básica, necesitás activar el perfil de creadora.</p><h3>Requisitos para activar</h3><ul><li>Ser mayor de 18 años</li><li>Tener un documento de identidad válido</li><li>Cuenta bancaria o método de pago</li><li>Fotos de verificación (selfie con documento)</li></ul>', orderNum: 2, contentType: 'text' },
    { id: 'les-2-3', moduleId: 'mod-2', title: 'Paso a paso para la verificación', content: '<h2>Verificación de identidad</h2><p>OnlyFans requiere verificación de identidad para poder cobrar.</p><h3>Lo que necesitás</h3><ul><li>Documento de identidad válido (DNI, pasaporte o cédula)</li><li>Una selfie sosteniendo tu documento junto a tu cara</li><li>Datos bancarios para recibir pagos</li></ul><h3>Tips para que te aprueben rápido</h3><ul><li>Asegurate de que la foto sea clara y bien iluminada</li><li>El documento debe estar vigente y ser legible</li><li>Tu cara debe verse claramente en la selfie</li><li>No uses filtros ni edites la foto</li></ul>', orderNum: 3, contentType: 'text' },

    // Module 3
    { id: 'les-3-1', moduleId: 'mod-3', title: 'Tus Primeros Ajustes', content: '<h2>Tus primeros ajustes</h2><p>Una vez verificada tu cuenta, es momento de configurar todo correctamente antes de empezar a publicar.</p><h3>Ajustes de privacidad obligatorios</h3><ul><li><strong>Geoblocking:</strong> Bloqueá tu país, provincia y ciudad de residencia</li><li><strong>Perfil privado:</strong> Activá la opción de perfil privado</li><li><strong>Notificaciones:</strong> Configurá las notificaciones a tu gusto</li><li><strong>Watermark:</strong> Activá la marca de agua en tus fotos y videos</li></ul><h3>Ajustes de suscripción</h3><p>Definí el precio de tu suscripción mensual. Empezá con un precio accesible y subilo a medida que crezcas.</p>', orderNum: 1, contentType: 'text' },
    { id: 'les-3-2', moduleId: 'mod-3', title: 'Menú Desplegable', content: '<h2>El menú desplegable</h2><p>El menú lateral de OnlyFans es tu centro de operaciones.</p><h3>Secciones principales</h3><ul><li><strong>Home:</strong> Tu feed principal</li><li><strong>Messages:</strong> Mensajes directos con suscriptores</li><li><strong>Notifications:</strong> Alertas de pagos, suscripciones y tips</li><li><strong>Statistics:</strong> Tus métricas y ganancias</li><li><strong>Profile:</strong> Tu perfil público</li><li><strong>Settings:</strong> Configuración general</li></ul>', orderNum: 2, contentType: 'text' },
    { id: 'les-3-3', moduleId: 'mod-3', title: 'Sección Especial: Retiro de dinero (Cómo Cobrar tus Dólares)', content: '<h2>Cómo cobrar tus dólares</h2><p>Esta es una de las secciones más importantes.</p><h3>Métodos de retiro</h3><ul><li><strong>Transferencia bancaria directa:</strong> Solo disponible si ganaste más de $20 USD</li><li><strong>Transferencia automática:</strong> Se ejecuta automáticamente cada cierto período</li><li><strong>Retiro manual:</strong> Vos decidís cuándo retirar</li></ul><h3>Para Argentina</h3><p>Las creadoras argentinas pueden cobrar mediante transferencia internacional. Los tiempos de acreditación varían entre 3 y 5 días hábiles.</p>', orderNum: 3, contentType: 'text' },

    // Module 4
    { id: 'les-4-1', moduleId: 'mod-4', title: 'Cómo armar tus publicaciones', content: '<h2>Cómo armar tus publicaciones</h2><p>La barra de herramientas es lo que usás para crear cada publicación.</p><h3>Elementos de una publicación</h3><ul><li><strong>Texto:</strong> Descripción, call to action, engagement</li><li><strong>Fotos:</strong> Imágenes y galerías</li><li><strong>Videos:</strong> Contenido en video</li><li><strong>Audio:</strong> Mensajes de voz</li><li><strong>PPV:</strong> Contenido pago adicional</li><li><strong>Poll:</strong> Encuestas para interactuar</li><li><strong>Programación:</strong> Publicar en horario programado</li></ul><h3>Estrategia de publicación</h3><p>No subas todo de una. Distribuí tu contenido a lo largo de la semana para mantener el engagement.</p>', orderNum: 1, contentType: 'text' },

    // Module 5
    { id: 'les-5-1', moduleId: 'mod-5', title: 'La Foto de Portada (Banner)', content: '<h2>La foto de portada</h2><p>Tu banner es lo primero que ven los visitantes.</p><h3>Características del banner ideal</h3><ul><li>Resolución alta (mínimo 1920x1080)</li><li>Coherente con tu marca personal</li><li>Que genere curiosidad y deseo de suscribirse</li><li>Sin mostrar tu cara si querés mantener anonimato</li></ul>', orderNum: 1, contentType: 'text' },
    { id: 'les-5-2', moduleId: 'mod-5', title: 'El Arte de Redactar tu Biografía (Tu Carta de Presentación)', content: '<h2>Tu biografía es tu carta de presentación</h2><p>La biografía de tu perfil es donde convencés al visitante de que vale la pena suscribirse.</p><h3>Estructura de una biografía efectiva</h3><ul><li><strong>Hook:</strong> Primera línea que captura la atención</li><li><strong>Valor:</strong> Qué contenido van a encontrar</li><li><strong>Frecuencia:</strong> Con qué frecuencia publicás</li><li><strong>Exclusivo:</strong> Qué solo encuentran en tu perfil</li><li><strong>CTA:</strong> Llamado a la acción para suscribirse</li></ul>', orderNum: 2, contentType: 'text' },
    { id: 'les-5-3', moduleId: 'mod-5', title: 'TIPS: ¿Por qué comenzar con una Cuenta Free?', content: '<h2>¿Por qué comenzar con una Cuenta Free?</h2><p>Empezar con una cuenta gratuita es una estrategia inteligente para las creadoras nuevas.</p><h3>Ventajas de la cuenta free</h3><ul><li>Conseguís suscriptores más fácilmente (es gratis)</li><li>Podés vender contenido PPV desde tu cuenta gratuita</li><li>Construís una comunidad antes de pasar a pago</li><li>Probás qué tipo de contenido funciona mejor</li></ul><h3>Cómo monetizar una cuenta free</h3><p>Subí contenido teaser gratuito y cobrá por el contenido premium vía PPV.</p>', orderNum: 3, contentType: 'text' },
    { id: 'les-5-4', moduleId: 'mod-5', title: 'Mensaje de Bienvenida Automatizado', content: '<h2>Mensaje de bienvenida automatizado</h2><p>El mensaje de bienvenida es lo primero que ve un nuevo suscriptor.</p><h3>Qué incluir</h3><ul><li>Agradecimiento por suscribirse</li><li>Resumen de qué pueden esperar</li><li>Un regalo o contenido exclusivo de bienvenida</li><li>Invitación a interactuar</li></ul><h3>Cómo configurarlo</h3><p>Andá a Settings > Messages > Welcome Message. Escribí un mensaje cálido y personal. Adjuntá una foto o video exclusivo de bienvenida.</p>', orderNum: 4, contentType: 'text' },

    // Module 6
    { id: 'les-6-1', moduleId: 'mod-6', title: 'Estrategias de Tráfico y Difusión', content: '<h2>Estrategias de tráfico y difusión</h2><p>Conseguir tus primeros suscriptores es el desafío más grande cuando arrancás.</p><h3>Estrategias principales</h3><ul><li><strong>Redes sociales:</strong> Instagram, Twitter/X, TikTok, Reddit</li><li><strong>SEO en OnlyFans:</strong> Palabras clave en tu bio y publicaciones</li><li><strong>Colaboraciones:</strong> Shoutouts con otras creadoras</li><li><strong>Contenido viral:</strong> Publicaciones que se comparten solas</li><li><strong>Promoción cruzada:</strong> Redirigir tráfico entre plataformas</li></ul><h3>Reddit como fuente de tráfico</h3><p>Reddit es una de las mejores fuentes de tráfico orgánico para creadoras de OnlyFans. Los subreddits específicos te permiten llegar a tu audiencia ideal sin invertir dinero en publicidad.</p><h3>Bienvenida a tu Nueva Era</h3><p>Con todas estas herramientas y conocimientos, estás lista para comenzar tu camino como creadora de élite. La constancia, la estrategia y la privacidad son tus tres pilares. Bienvenida a tu nueva era.</p>', orderNum: 1, contentType: 'text' },
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
