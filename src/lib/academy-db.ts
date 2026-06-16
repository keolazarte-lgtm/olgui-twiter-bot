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
    { id: 'mod-1', title: 'Mentalidad, Preparación y Legado', description: 'De mujer a mujer: cómo superar los miedos, protegerte y construir tu imperio desde cero. Con o sin rostro.', order_num: 1, icon: 'Brain' },
    { id: 'mod-2', title: 'De Cero a Creadora: Creación y Verificación', description: 'Creá tu cuenta de OnlyFans paso a paso, activá el modo creadora y verificá tu identidad sin errores ni rechazos.', order_num: 2, icon: 'Lock' },
    { id: 'mod-3', title: 'El Panel de Control: Tu Centro de Mandos', description: 'Tus primeros ajustes, el menú desplegable completo y la sección especial de retiro de dinero. Cómo cobrar tus dólares.', order_num: 3, icon: 'Shield' },
    { id: 'mod-4', title: 'La Barra de Herramientas', description: 'Todos los íconos y funciones para armar tus publicaciones de forma profesional. Imágenes, videos, encuestas y más.', order_num: 4, icon: 'DollarSign' },
    { id: 'mod-5', title: 'Perfil e Identidad de Alto Valor', description: 'Nombre artístico, foto de perfil, portada, biografía, cuenta gratis y mensaje de bienvenida automatizado.', order_num: 5, icon: 'UserCheck' },
    { id: 'mod-6', title: 'Guía de Tarifas', description: 'Estrategia de venta dinámica — Tarifas de bóveda, contenido personalizado y servicios en tiempo real.', order_num: 6, icon: 'Banknote' },
    { id: 'mod-7', title: 'Cómo obtener tus primeros suscriptores', description: 'Promoción cruzada, redes de tráfico orgánico y estrategias para arrancar con ventas desde el día uno.', order_num: 7, icon: 'Flame' },
  ]

  for (const m of modules) {
    await db.execute({
      sql: `INSERT INTO modules (id, title, description, order_num, icon) VALUES (?, ?, ?, ?, ?)`,
      args: [m.id, m.title, m.description, m.order_num, m.icon]
    })
  }

  const lessonsData: { id: string; moduleId: string; title: string; content: string; orderNum: number; contentType: string }[] = [
    // ─── Module 1: Mentalidad, Preparación y Legado ───
    { id: 'les-1-1', moduleId: 'mod-1', title: 'El Espejo de la Emperatriz (Mi Historia)', content: '<h2>Si estás leyendo estas páginas, quiero que te detengas un segundo.</h2><p>Olvidate de las pantallas, de las redes y del ruido exterior. Quiero hablarte de mujer a mujer, de madre a madre, de emprendedora a emprendedora.</p><p>Hoy me conocés como Emperatriz, la mentora detrás de Dinastía Academy. Manejo mi propio negocio digital, tomo mis propias decisiones y soy la dueña absoluta de mi tiempo y de mis ingresos. Pero mi Imperio no se construyó en un día, y mucho menos nació desde la comodidad.</p><h3>El motor del cambio</h3><p>Tengo 49 años y tres hijos. Hace un tiempo, me encontré en una encrucijada que seguro conocés muy bien: la necesidad urgente de generar ingresos, de progresar, pero con la condición innegociable de necesitar un trabajo en casa. Quería estar para mis hijos, quería manejar mis horarios y no depender de un jefe ni de un empleo tradicional que me consumiera la vida a cambio de un sueldo básico.</p><p>Fue ahí cuando decidí dar el paso hacia la creación de contenido premium. Pero te mentiría si te dijera que no tuve dudas. Al contrario, estaba llena de ellas.</p><h3>Los fantasmas: La edad, el cuerpo y el miedo al "qué dirán"</h3><p>Cuando decidí dedicarme al 100% a esto, aparecieron todos los miedos juntos. Me miraba al espejo y me preguntaba: ¿Tendré la edad para esto? ¿Qué pasará con mi cuerpo? El mercado nos vende la falsa idea de que este mundo es solo para chicas de 20 años con cuerpos de revista, y el primer gran trabajo es romper ese prejuicio en nuestra propia cabeza.</p><p>Y el miedo más grande de todos: la privacidad. No quería que nadie me reconociera. No quería que un vecino, un familiar o un conocido del pasado se cruzara con mi perfil. Tenía pánico de perder el control de mi imagen.</p><h3>El secreto del éxito: Promoción inteligente y anonimato local</h3><p>¿Cómo superé ese miedo? Entendiendo que no hace falta exponer tu vida personal ante conocidos para tener un negocio millonario. Aprendí a jugar el juego de la promoción inteligente. Mientras mi perfil de OnlyFans es completamente profesional, mi estrategia de marketing se construye desde el anonimato hacia mi entorno: utilizando redes sociales dedicadas exclusivamente al negocio, sin vincular mi identidad real, y explotando plataformas de altísimo alcance internacional.</p><p>Es decir, te promocionás de forma estratégica hacia afuera, buscando al cliente ideal en el mercado global, mientras tu entorno local permanece completamente a oscuras gracias al Geoblocking. Además, me especialicé en el nicho del FemDom (Dominación Femenina) y los fetiches, un mercado de alta rentabilidad donde la psicología, la autoridad y el control valen oro.</p><h3>La recompensa</h3><p>Hoy miro hacia atrás y sé que cada miedo superado valió la pena. Gracias a haber tomado esa decisión con valentía, a haberme plantado con autoridad y a haber tratado esto como una empresa seria, mi vida cambió por completo. Solo me dedico a esto. Logré la independencia absoluta y, lo más hermoso de todo, pude mudarme y hoy vivo en el lugar que siempre soñé: un rincón mágico rodeado de bosque y mar.</p><p>Si yo pude cambiar mi realidad a los 49 años, con tres hijos, partiendo desde casa y protegiendo mi privacidad desde las sombras, vos también podés hacerlo. No importa tu edad, no importa tu cuerpo, no importa de dónde arranques hoy. Lo único que necesitás es la determinación de querer construir tu propio Imperio.</p><p><strong>Bienvenida a tu nueva era. Bienvenida a Dinasty Academy.</strong></p>', orderNum: 1, contentType: 'text' },

    // ─── Module 2: De Cero a Creadora ───
    { id: 'les-2-1', moduleId: 'mod-2', title: 'El Primer Paso: Crear tu Cuenta', content: '<h2>1. La Plataforma No es una App, es una Web</h2><p><strong>El Peligro de las Apps Falsas:</strong> Si entrás a la PlayStore o AppStore y buscás la aplicación, vas a encontrar decenas de opciones falsas. Jamás las descargues.</p><p><strong>Cómo Ingresar Correctamente:</strong> Abrí el navegador y escribí directamente la dirección oficial (www.onlyfans.com).</p><h2>2. Cómo Crear tu Cuenta desde Cero</h2><ol><li><strong>La Pantalla de Inicio:</strong> Cuadro central para iniciar sesión o registrarte.</li><li><strong>Elegí tu Método:</strong> Recomendación — registrarse con "Sign up for OnlyFans" (no con Google personal).</li><li><strong>Tus Datos de Acceso:</strong><ul><li><strong>Correo Electrónico:</strong> Gmail nuevo exclusivo para el trabajo (ej: GoddessVictoria@gmail.com)</li><li><strong>Contraseña:</strong> Letras, números y símbolos</li><li><strong>Nombre de usuario provisorio</strong> (se cambiará después)</li></ul></li><li>Aceptá términos → Confirmá correo → Cuenta base abierta</li></ol>', orderNum: 1, contentType: 'text' },
    { id: 'les-2-2', moduleId: 'mod-2', title: 'Activación del Modo Creador', content: '<h2>Transformar tu Perfil a Cuenta de Creadora</h2><h3>1. Activación del Modo Creador</h3><ol><li>Ingresá a la plataforma</li><li>Clic en ícono de perfil → "Become a Creator"</li><li>Se habilita formulario de verificación</li></ol>', orderNum: 2, contentType: 'text' },
    { id: 'les-2-3', moduleId: 'mod-2', title: 'La Verificación Perfecta', content: '<h2>La Verificación Perfecta</h2><h3>1. La Foto de tu Documento</h3><p>Buena luz natural, encuadre completo, nitidez absoluta, frente y dorso.</p><h3>2. La "Selfie" de Verificación</h3><ul><li><strong>Prohibido cámara delantera</strong> (invierte letras). Usar cámara trasera con ayuda de alguien.</li><li>Fondo limpio.</li><li>Documento al lado de la mejilla sin tapar datos.</li><li>Rostro despejado.</li></ul><h3>3. Red Social de Respaldo</h3><p>Enlace a Instagram público con fotos tuyas.</p><h3>4. La espera</h3><p>24 a 48 horas para aprobación.</p>', orderNum: 3, contentType: 'text' },

    // ─── Module 3: El Panel de Control ───
    { id: 'les-3-1', moduleId: 'mod-3', title: 'Tus Primeros Ajustes y el Menú Desplegable', content: '<h2>Cambiar a Español</h2><p>Perfil → Settings → Language → Español</p><p><strong>REGLA DE ORO:</strong> Crea un nombre alternativo y úsalo en todas tus plataformas.</p><h2>Panel completo</h2><ol><li><strong>Mi Perfil</strong> — Tu vidriera principal. Mínimo 15-20 publicaciones variadas, sugerentes pero no explícitas. 3-4 historias activas siempre.</li><li><strong>Mis Referencias</strong> — Gráficos de ganancias, suscriptores activos, rendimiento.</li><li><strong>Colecciones</strong> — Clasificar suscriptores por comportamiento, gustos y gasto.</li><li><strong>Archivo</strong> — Contenido programado y campañas SFS.</li><li><strong>Bóveda (Vault)</strong> — Banco de almacenamiento masivo de todo contenido subido.</li><li><strong>Configuración</strong> — Precio de suscripción, cuenta bancaria, Geoblocking.</li><li><strong>Transmisiones (Live)</strong> — Shows en vivo con propinas.</li><li><strong>Declaraciones</strong> — Historial detallado de ganancias.</li><li><strong>Estadísticas</strong> — Gráficos de rendimiento.</li><li><strong>Formularios de Liberación</strong> — Autorizaciones legales para contenido compartido.</li><li><strong>Tus tarjetas</strong> — Para comprar contenido (no para recibir pagos).</li><li><strong>Banco (para ganar)</strong> — Vinculación de cuenta bancaria para cobrar.</li><li><strong>Ayuda y soporte técnico</strong></li><li><strong>Modo de luz / Modo oscuro</strong></li><li><strong>Cerrar sesión</strong></li></ol>', orderNum: 1, contentType: 'text' },
    { id: 'les-3-2', moduleId: 'mod-3', title: 'Sección Especial: Retiro de Dinero', content: '<h2>Retiro de dinero</h2><p><strong>Ruta recomendada para Latinoamérica:</strong> Skrill → Binance → Cuenta local (Brubank, Mercado Pago, etc.)</p><h3>ALERTA ARGENTINA</h3><ul><li><strong>Transferencia bancaria local (Pagomundo):</strong> Pesificación al dólar oficial, alerta AFIP, bloqueos</li><li><strong>Transferencia directa VISA:</strong> Pesificación forzosa, rechazos automáticos</li></ul><p><strong>REGLA DE ORO:</strong> Circuito Skrill → Binance → Cuenta Local</p><h3>PASO 1: Crear cuenta Skrill</h3><p>Mismo mail que OnlyFans, nombres en MAYÚSCULAS, divisa en USD.</p><h3>PASO 2: Activación</h3><p>Primer depósito ~$5 USD via Rapipago (desde PC, NO celular).</p><h3>PASO 3: Verificación</h3><p>Foto DNI frente/dorso + selfie + comprobante de domicilio.</p><h3>PASO 4: Vinculación</h3><p>OnlyFans → Banco → Skrill.</p><h3>Instructivo Cripto (Skrill → Binance vía USDT)</h3><ol><li><strong>Binance:</strong> Depositar Cripto → USDT → Red Ethereum (ERC20) → Copiar dirección</li><li><strong>Skrill:</strong> Enviar → Cartera cripto → USDT → Red ERC20 → Pegar dirección → Enviar</li><li>Siempre hacer prueba con monto mínimo antes de transferencias grandes.</li></ol>', orderNum: 2, contentType: 'text' },

    // ─── Module 4: La Barra de Herramientas ───
    { id: 'les-4-1', moduleId: 'mod-4', title: 'Cómo armar tus publicaciones', content: '<h2>La Barra de Herramientas</h2><p>Iconos de izquierda a derecha:</p><ol><li><strong>Imagen</strong> — Subir fotos</li><li><strong>Cámara de Video</strong> — Subir videos</li><li><strong>Micrófono</strong> — Notas de voz</li><li><strong>Bóveda</strong> — Republicar contenido guardado</li><li><strong>Gráfico de Barras</strong> — Encuestas interactivas</li><li><strong>Pregunta</strong> — Publicaciones con encuestas</li><li><strong>Reloj de Arena</strong> — Vencimiento del post (24-48hs)</li><li><strong>Calendario</strong> — Programar publicación</li><li><strong>Tres Puntos (...)</strong> — Precio, objetivo de recaudación, etiquetas, formato</li><li><strong>Transmisión en Vivo</strong> — Show live</li><li><strong>Historias (Stories)</strong> — Círculo "+" → Contenido de 24 horas. Estrategia: día a día, urgencia.</li></ol>', orderNum: 1, contentType: 'text' },

    // ─── Module 5: Perfil e Identidad de Alto Valor ───
    { id: 'les-5-1', moduleId: 'mod-5', title: 'Identidad Digital y Seguridad Visual', content: '<h2>El Nombre Artístico</h2><ul><li><strong>Vainilla:</strong> Nombres dulces, sexis, frescos o elegantes en inglés</li><li><strong>FemDom:</strong> Nombres imperativos, aristocráticos o mitológicos</li><li>Evitar guion bajo (_) en el @usuario. Sumar palabras como Goddess, Queen.</li></ul><h2>Foto de Perfil</h2><ul><li>Prohibido desnudos</li><li>Prohibido fotos de espaldas</li><li>Elección personal mostrar o no rostro</li></ul><h2>Foto de Portada</h2><ul><li>Alta definición, formato horizontal</li><li>Sin pixelados</li></ul>', orderNum: 1, contentType: 'text' },
    { id: 'les-5-2', moduleId: 'mod-5', title: 'El Arte de Redactar tu Biografía', content: '<h2>Opción A: Biografía Vainilla</h2><p>Saludo sugerente, personalidad, qué encontrarán adentro, invitación a la acción.</p><h2>Opción B: Biografía FemDom</h2><p>Título de autoridad, reglas estrictas, fetiches principales (Findom, SPH, JOI, CEI, Adoración de pies, Chastity).</p><h3>Tips</h3><ul><li>Emojis con estrategia</li><li>Menos es más</li><li>Menú de servicios al final</li></ul>', orderNum: 2, contentType: 'text' },
    { id: 'les-5-3', moduleId: 'mod-5', title: 'Estrategia de Apertura: La Cuenta Gratis (Free)', content: '<h2>¿Por qué comenzar Free?</h2><p>Derriba barrera de entrada, construye base de datos, la plata se hace vendiendo PPV en mensajes privados.</p><h3>Regla de Oro del Feed Público</h3><p>Nada regalado. Solo contenido sugerente. Lo explícito va con candado.</p><h3>Mensaje de Bienvenida Automatizado</h3><p>Configuración → Conversaciones → Activar mensaje automatizado.</p><p><strong>NO enviar PPV en el primer mensaje.</strong> Debe ser abierto, libre y magnético para iniciar la conversación.</p>', orderNum: 3, contentType: 'text' },

    // ─── Module 6: Guía de Tarifas ───
    { id: 'les-6-1', moduleId: 'mod-6', title: 'Tarifas de Bóveda (Contenido Pregrabado)', content: '<h2>Tarifas de Bóveda (Pregrabado)</h2><h3>Videos Femdom</h3><ul><li><strong>$35-$45 USD</strong> / 2 min (aumentar en siguientes paquetes)</li></ul><h3>Videos Explícitos</h3><ul><li><strong>$35 USD</strong> por cada minuto</li></ul><h3>Packs de Fotos</h3><ul><li><strong>$3-$5 USD</strong> cada 5 fotos</li></ul>', orderNum: 1, contentType: 'text' },
    { id: 'les-6-2', moduleId: 'mod-6', title: 'Contenido Personalizado (Custom)', content: '<h2>Contenido Personalizado</h2><p><strong>REGLA: NUNCA grabar sin pago TOTAL por adelantado.</strong></p><h3>Femdom Custom</h3><ul><li><strong>$60-$80 USD</strong> / 2-3 min</li></ul><h3>Explícito personalizado</h3><ul><li><strong>$80-$120 USD</strong> / 2 min</li></ul>', orderNum: 2, contentType: 'text' },
    { id: 'les-6-3', moduleId: 'mod-6', title: 'Servicios en Tiempo Real', content: '<h2>Servicios en Tiempo Real</h2><h3>Sexting</h3><ul><li><strong>$50-$60 USD</strong> / 30 min</li></ul><h3>Videollamadas</h3><ul><li>5min <strong>$80</strong></li><li>10min <strong>$100</strong></li><li>15min <strong>$140 USD</strong></li></ul><p>No tener miedo de enviar contenido más barato para cerrar una venta.</p>', orderNum: 3, contentType: 'text' },

    // ─── Module 7: Primeros Suscriptores ───
    { id: 'les-7-1', moduleId: 'mod-7', title: 'Estrategias de Tráfico y Difusión', content: '<h2>¿Cómo obtener tus primeros suscriptores desde cero?</h2><h3>Promoción Cruzada (SFS)</h3><ul><li>Intercambiar publicaciones con otras creadoras</li><li>HXH + mensajes masivos</li></ul><h3>Redes de Tráfico Orgánico</h3><ul><li><strong>Reddit</strong></li><li><strong>Twitter (X)</strong></li><li><strong>Telegram</strong></li><li><strong>Instagram</strong> — muestras de contenido estético + enlace a cuenta gratis</li></ul><p>No estás obligada a mostrar rostro en redes externas.</p>', orderNum: 1, contentType: 'text' },
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
