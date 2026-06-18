import type { Metadata } from 'next'
import Link from 'next/link'
import { Crown, ArrowLeft, Shield } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Dinasty Academy',
  description: 'Cómo Dinasty Academy recopila, usa y protege tu información personal.',
}

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Top bar */}
      <header className="border-b border-amber-500/10 py-4 px-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-amber-400/60 hover:text-amber-400 text-xs font-cinzel tracking-widest transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            VOLVER
          </Link>
          <div className="inline-flex items-center gap-2 text-amber-400/40 text-xs font-cinzel tracking-widest">
            <Crown className="w-3.5 h-3.5" />
            DINASTY ACADEMY
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em]">DOCUMENTO LEGAL</p>
            <h1 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold gold-text">
              Política de Privacidad
            </h1>
          </div>
        </div>

        <p className="font-inter text-white/40 text-xs mb-10">
          Última actualización: Junio 2026
        </p>

        <div className="space-y-8 font-inter text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">1. Quiénes somos</h2>
            <p>
              Dinasty Academy (en adelante, "la Plataforma") es un servicio de educación online
              para creadoras de contenido de plataformas como OnlyFans y Fansly. Operamos desde
              Argentina y ofrecemos nuestros servicios a usuarias mayores de 18 años. Esta
              política describe cómo recopilamos, usamos, almacenamos y protegemos la información
              personal de las usuarias que se registran, compran o navegan nuestro sitio.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">2. Información que recopilamos</h2>
            <p className="mb-3">Recopilamos la siguiente información:</p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li><strong className="text-white/90">Datos de cuenta:</strong> nombre, email, contraseña (encriptada) y número de WhatsApp opcional que nos proporcionás al registrarte.</li>
              <li><strong className="text-white/90">Datos de pago:</strong> procesados exclusivamente por MercadoPago. Nunca almacenamos datos de tarjetas, CVV ni información financiera sensible en nuestros servidores.</li>
              <li><strong className="text-white/90">Datos de navegación:</strong> dirección IP, tipo de dispositivo, navegador, páginas visitadas y referente (de dónde llegaste a nuestro sitio). Esto nos permite entender el tráfico y mejorar la plataforma.</li>
              <li><strong className="text-white/90">Datos de progreso:</strong> qué módulos y lecciones vas completando dentro del campus, para ofrecerte una experiencia personalizada.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">3. Para qué usamos tu información</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Proveer acceso al campus y habilitar el contenido que compraste.</li>
              <li>Procesar pagos y emitir comprobantes a través de MercadoPago.</li>
              <li>Enviarte emails transaccionales (bienvenida, recuperación de contraseña, notificaciones del curso).</li>
              <li>Ofrecerte soporte por WhatsApp o email cuando lo necesites.</li>
              <li>Analizar el uso de la plataforma para mejorar el contenido y la experiencia.</li>
              <li>Cumplir con obligaciones legales y prevenir fraude.</li>
            </ul>
            <p className="mt-3">
              <strong className="text-white/90">Nunca:</strong> vendemos, alquilamos ni compartimos tus datos
              con terceros con fines comerciales. Tu información es estrictamente confidencial.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">4. Base legal del tratamiento</h2>
            <p>
              Tratamos tus datos personales sobre las siguientes bases: (a) tu consentimiento expreso
              al registrarte y aceptar esta política; (b) la ejecución del contrato de compra del
              curso; (c) nuestro interés legítimo en mejorar la plataforma y prevenir fraudes; y
              (d) el cumplimiento de obligaciones legales (fiscales, contables, defensa al consumidor).
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">5. Protección de tu información</h2>
            <p>
              Implementamos medidas técnicas y organizativas razonables para proteger tus datos:
              conexiones HTTPS encriptadas, contraseñas almacenadas con hash (bcrypt), cookies
              httpOnly para sesiones, y acceso restringido al panel administrativo. Sin embargo,
              ningún sistema es 100% seguro, y no podemos garantizar la seguridad absoluta de la
              información transmitida por internet.
            </p>
            <p className="mt-3">
              <strong className="text-white/90">Privacidad de la creadora:</strong> entendemos que
              muchas de nuestras alumnas trabajan con anonimato. Por eso, jamás publicamos nombres,
              emails ni identificadores de usuarias en la home, en redes sociales ni en ningún
              testimonio sin consentimiento expreso y por escrito.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">6. Cookies y tecnologías similares</h2>
            <p>
              Usamos cookies y almacenamiento local (localStorage) para: mantener tu sesión iniciada,
              recordar preferencias de idioma, y medir el tráfico de forma agregada y anónima. No
              usamos cookies de terceros para publicidad dirigida. Podés desactivar las cookies desde
              la configuración de tu navegador, aunque algunas funciones del campus podrían no funcionar
              correctamente.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">7. Compartir información con terceros</h2>
            <p>
              Solo compartimos tus datos con los siguientes proveedores, en la medida necesaria para
              prestar el servicio:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li><strong className="text-white/90">MercadoPago:</strong> para procesar pagos. Su política de privacidad está en mercadopago.com.ar/privacidad.</li>
              <li><strong className="text-white/90">Vercel:</strong> hosting del sitio (vercel.com/legal/privacy-policy).</li>
              <li><strong className="text-white/90">Proveedor de email transaccional:</strong> para enviarte correos del curso.</li>
            </ul>
            <p className="mt-3">
              No compartimos datos con autoridades salvo requerimiento judicial expreso o ante
              obligación legal clara.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">8. Tus derechos (Ley 25.326)</h2>
            <p>
              Como usuaria, tenés derecho a: (a) acceder a tus datos personales; (b) solicitar la
              rectificación de datos inexactos; (c) solicitar la supresión de tus datos ("derecho al
              olvido"); (d) oponerte al tratamiento; (e) solicitar la portabilidad de tus datos; y
              (f) revocar el consentimiento otorgado. Para ejercer estos derechos, escribinos a
              dinastyacademy@gmail.com desde el email con el que te registraste, y te responderemos
              dentro de los 10 días hábiles.
            </p>
            <p className="mt-3">
              La Agencia de Acceso a la Información Pública (AAIP) es el órgano de control en
              Argentina. Podés presentar reclamos en argentina.gob.ar/aaip.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">9. Conservación de datos</h2>
            <p>
              Conservamos tus datos mientras dure la relación contractual (tu acceso al curso) y
              durante los plazos legales aplicables (5 años para fines fiscales, 10 años para
              comprobantes). Vencidos esos plazos, los eliminamos o anonimizamos.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">10. Menores de edad</h2>
            <p>
              Nuestra plataforma es estrictamente para mayores de 18 años. No recopilamos
              intencionalmente datos de menores. Si detectamos que una usuaria es menor, eliminamos
              su cuenta y sus datos de forma inmediata.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">11. Cambios a esta política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Te notificaremos por email sobre
              cambios significativos y actualizaremos la fecha de "última actualización" al inicio
              de este documento.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">12. Contacto</h2>
            <p>
              Para cualquier consulta sobre privacidad, escribinos a
              <a href="mailto:dinastyacademy@gmail.com" className="text-amber-400 hover:underline"> dinastyacademy@gmail.com</a>
              {' '}o por WhatsApp al número que figura en la home.
            </p>
          </section>

        </div>

        <div className="mt-12 pt-8 border-t border-amber-500/10 text-center">
          <Link href="/" className="inline-flex items-center gap-2 gold-btn-glow text-black font-cinzel font-bold tracking-wider text-xs px-6 py-3 rounded-lg no-underline">
            <Crown className="w-4 h-4" />
            VOLVER A LA HOME
          </Link>
        </div>
      </main>
    </div>
  )
}
