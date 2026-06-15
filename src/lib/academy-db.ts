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

  const modules = [
    { id: 'mod-1', title: 'Geoblocking Absoluto', description: 'Bloqueo geográfico total — Invisible en tu país o provincia. Nadie de tu entorno te encuentra, ni por accidente.', order_num: 1, icon: 'Shield' },
    { id: 'mod-2', title: 'Bloqueo de Usuarios Específicos', description: 'Control total sobre quién puede y quién NO puede ver tu contenido. Elegí vos quien entra y quien queda afuera.', order_num: 2, icon: 'UserCheck' },
    { id: 'mod-3', title: 'Registro y Verificación Paso a Paso', description: 'Guía técnica completa para crear tu cuenta y verificar sin errores ni rechazos. De la A a la Z.', order_num: 3, icon: 'Lock' },
    { id: 'mod-4', title: 'Opciones de Retiro Seguras y Privadas', description: 'Los métodos más seguros para cobrar sin exponer tu identidad. Tu plata, tu privacidad, tu control.', order_num: 4, icon: 'DollarSign' },
    { id: 'mod-5', title: 'Efectivo en la Mano', description: 'El paso a paso para tener tu dinero disponible cuando quieras. Sin intermediarios innecesarios.', order_num: 5, icon: 'Banknote' },
    { id: 'mod-6', title: 'Mentalidad de Negocio y Marca Personal', description: 'Con o sin rostro — aprendé a construir una marca que venda. Pensá como empresaria, no como empleada.', order_num: 6, icon: 'Brain' },
  ]

  for (const m of modules) {
    const existing = await db.execute({ sql: 'SELECT id FROM modules WHERE id = ?', args: [m.id] })
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO modules (id, title, description, order_num, icon) VALUES (?, ?, ?, ?, ?)`,
        args: [m.id, m.title, m.description, m.order_num, m.icon]
      })
    }
  }

  // Seed lessons for each module
  const lessonsData: { id: string; moduleId: string; title: string; content: string; orderNum: number; contentType: string }[] = [
    // Module 1: Geoblocking
    { id: 'les-1-1', moduleId: 'mod-1', title: '¿Qué es el Geoblocking y por qué es esencial?', content: '<h2>¿Qué es el Geoblocking?</h2><p>El geoblocking es una función de seguridad que te permite bloquear el acceso a tu contenido desde ubicaciones geográficas específicas. En el contexto de OnlyFans y plataformas similares, esto significa que las personas de tu país, provincia o ciudad no podrán encontrar tu perfil ni ver tu contenido.</p><p>Esta es la herramienta más poderosa para proteger tu identidad y mantener tu privacidad. Sin geoblocking, cualquier persona que te conozca podría encontrarte en la plataforma con una simple búsqueda.</p><h3>¿Por qué necesitas activarlo?</h3><ul><li>Protección de identidad: Nadie de tu entorno te encuentra</li><li>Tranquilidad mental: Podés trabajar sin miedo a ser descubierta</li><li>Control total: Vos decidís quién puede y quién no puede verte</li></ul>', orderNum: 1, contentType: 'text' },
    { id: 'les-1-2', moduleId: 'mod-1', title: 'Configuración paso a paso del Geoblocking en OnlyFans', content: '<h2>Configuración del Geoblocking</h2><p>Seguí estos pasos para activar el geoblocking en tu cuenta de OnlyFans:</p><ol><li>Ingresá a tu cuenta de OnlyFans</li><li>Andá a Settings (Configuración)</li><li>Buscá la sección de Security & Privacy</li><li>Activá la opción de Geoblocking</li><li>Seleccioná los países, provincias o ciudades que querés bloquear</li><li>Guardá los cambios</li></ol><p><strong>Importante:</strong> Te recomendamos bloquear al menos tu país de residencia completo para máxima privacidad. Si vivís en una ciudad grande, considerá bloquear toda la provincia.</p>', orderNum: 2, contentType: 'text' },
    { id: 'les-1-3', moduleId: 'mod-1', title: 'Geoblocking en Fansly y otras plataformas', content: '<h2>Geoblocking en Fansly</h2><p>Fansly también ofrece opciones de geoblocking, aunque con algunas diferencias respecto a OnlyFans. En esta lección te explicamos cómo configurarlo en cada plataforma.</p><p>Fansly permite bloquear países completos y regiones específicas. La configuración es similar pero la interfaz varía.</p><h3>Otras plataformas</h3><p>La mayoría de las plataformas de contenido para adultos ofrecen alguna forma de geoblocking. Los principios son los mismos: bloquear ubicaciones geográficas para que las personas de esas zonas no puedan acceder a tu contenido.</p>', orderNum: 3, contentType: 'text' },

    // Module 2: Bloqueo de Usuarios
    { id: 'les-2-1', moduleId: 'mod-2', title: 'Bloqueo de usuarios por nombre de usuario', content: '<h2>Bloqueo selectivo de usuarios</h2><p>Además del geoblocking, podés bloquear usuarios específicos por su nombre de usuario. Esto es útil cuando sabés que alguien en particular está intentando acceder a tu contenido.</p><p>Para bloquear un usuario:</p><ol><li>Ingresá al perfil del usuario</li><li>Hacé clic en los tres puntos (más opciones)</li><li>Seleccioná "Block" (Bloquear)</li><li>Confirmá la acción</li></ol><p>El usuario bloqueado no podrá ver tu contenido ni enviarte mensajes.</p>', orderNum: 1, contentType: 'text' },
    { id: 'les-2-2', moduleId: 'mod-2', title: 'Lista de bloqueados y gestión avanzada', content: '<h2>Gestión de tu lista de bloqueados</h2><p>Es importante mantener tu lista de bloqueados actualizada. OnlyFans te permite ver y gestionar todos los usuarios bloqueados desde la configuración.</p><h3>Consejos:</h3><ul><li>Revisá tu lista periódicamente</li><li>Si alguien te encuentra a través de una cuenta nueva, bloqueala inmediatamente</li><li>Combiná geoblocking con bloqueo individual para máxima seguridad</li></ul>', orderNum: 2, contentType: 'text' },

    // Module 3: Registro y Verificación
    { id: 'les-3-1', moduleId: 'mod-3', title: 'Creación de cuenta paso a paso', content: '<h2>Creando tu cuenta de OnlyFans</h2><p>El proceso de registro en OnlyFans es sencillo pero hay detalles importantes que tenés que tener en cuenta para proteger tu privacidad desde el primer momento.</p><ol><li>Usá un email nuevo y privado (no tu email personal o laboral)</li><li>Elegí un nombre de usuario que no revele tu identidad</li><li>Completá la verificación de identidad (necesitás documento)</li><li>Configurá tus métodos de pago</li></ol><p><strong>Tip:</strong> Creá un email dedicado exclusivamente para tu cuenta de OnlyFans. Esto separa completamente tu vida personal de tu actividad en la plataforma.</p>', orderNum: 1, contentType: 'text' },
    { id: 'les-3-2', moduleId: 'mod-3', title: 'Verificación de identidad sin exponerte', content: '<h2>Verificación de identidad</h2><p>OnlyFans requiere verificación de identidad para poder cobrar. Esto puede parecer contradictorio con la privacidad, pero hay formas de manejarlo.</p><h3>Lo que necesitás:</h3><ul><li>Documento de identidad válido (DNI, pasaporte)</li><li>Una selfie sosteniendo tu documento</li><li>Datos bancarios para recibir pagos</li></ol><h3>Tranquilidad:</h3><p>Esta información es confidencial y solo la usa OnlyFans para verificar que sos mayor de edad y quien decís ser. No se muestra en tu perfil ni es visible para los suscriptores.</p>', orderNum: 2, contentType: 'text' },

    // Module 4: Retiro Seguro
    { id: 'les-4-1', moduleId: 'mod-4', title: 'Métodos de retiro disponibles', content: '<h2>Métodos de retiro en OnlyFans</h2><p>OnlyFans ofrece varios métodos para retirar tus ganancias. Es importante elegir el que mejor se adapte a tus necesidades de privacidad.</p><h3>Opciones disponibles:</h3><ul><li><strong>Transferencia bancaria directa:</strong> La más común, pero tu nombre aparece en el extracto</li><li><strong>Wallet de pago:</strong> Más privada, el dinero va a una billetera virtual</li><li><strong>Payoneer:</strong> Opción internacional con mayor privacidad</li></ul><p>Cada método tiene sus ventajas y desventajas en términos de privacidad, velocidad y comisiones.</p>', orderNum: 1, contentType: 'text' },
    { id: 'les-4-2', moduleId: 'mod-4', title: 'Configuración de retiros para Argentina', content: '<h2>Retiros para creadoras en Argentina</h2><p>Si estás en Argentina, tenés opciones específicas que te permiten cobrar de forma segura y privada.</p><h3>Métodos recomendados para Argentina:</h3><ul><li>Cuenta bancaria en dólares</li><li>Billeteras virtuales</li><li>Transferencia internacional</li></ul><p>Te explicamos paso a paso cómo configurar cada método y cuáles son los tiempos de acreditación típicos.</p>', orderNum: 2, contentType: 'text' },

    // Module 5: Efectivo en la Mano
    { id: 'les-5-1', moduleId: 'mod-5', title: 'Cómo tener tu dinero disponible rápidamente', content: '<h2>Efectivo en la mano</h2><p>Una de las mayores frustraciones de las creadoras es esperar días o semanas para acceder a su dinero. En esta lección te enseñamos las estrategias para tener tu plata disponible lo más rápido posible.</p><h3>Estrategias:</h3><ul><li>Configurar retiros automáticos</li><li>Elegir el método de retiro más rápido</li><li>Usar billeteras virtuales para acceso inmediato</li><li>Planificar tus retiros estratégicamente</li></ul>', orderNum: 1, contentType: 'text' },

    // Module 6: Mentalidad
    { id: 'les-6-1', moduleId: 'mod-6', title: 'Construí tu marca sin mostrar tu cara', content: '<h2>Marca personal sin rostro</h2><p>No necesitás mostrar tu cara para tener éxito en OnlyFans. Muchas de las creadoras más exitosas trabajan de forma anónima y construyen marcas poderosas.</p><h3>Claves para una marca sin rostro:</h3><ul><li>Elegí un nicho y un estilo visual consistente</li><li>Creá una personalidad de marca atractiva</li><li>Usá ángulos y encuadres creativos</li><li>Construí una conexión emocional con tu audiencia</li><li>Mantené la coherencia en todas tus publicaciones</li></ul><p>Recordá: tu marca es lo que la gente siente cuando interactúa con tu contenido. No necesitás una cara para crear esa conexión.</p>', orderNum: 1, contentType: 'text' },
    { id: 'les-6-2', moduleId: 'mod-6', title: 'Mentalidad empresarial para creadoras', content: '<h2>Pensá como empresaria</h2><p>El error más común de las creadoras es tratarse como empleadas en vez de como empresarias. Vos sos la dueña de tu negocio, y eso cambia todo.</p><h3>La mentalidad correcta:</h3><ul><li>Invertí en tu negocio (herramientas, contenido, marketing)</li><li>Trabajá de forma estratégica, no reactiva</li><li>Diversificá tus fuentes de ingreso</li><li>Planificá a largo plazo</li><li>Automatizá lo más que puedas</li></ul><p>Cuando cambias tu mentalidad de "vendo contenido" a "construyo un negocio", todo se transforma. Empezás a tomar decisiones más inteligentes y a ver resultados que antes parecían imposibles.</p>', orderNum: 2, contentType: 'text' },
  ]

  for (const l of lessonsData) {
    const existing = await db.execute({ sql: 'SELECT id FROM lessons WHERE id = ?', args: [l.id] })
    if (existing.rows.length === 0) {
      await db.execute({
        sql: `INSERT INTO lessons (id, module_id, title, content_type, content, order_num) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [l.id, l.moduleId, l.title, l.contentType, l.content, l.orderNum]
      })
    }
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
