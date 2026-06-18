import type { Metadata } from 'next'
import Link from 'next/link'
import { Crown, ArrowLeft, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Términos y Condiciones — Dinasty Academy',
  description: 'Términos y condiciones de uso de la plataforma Dinasty Academy.',
}

export default function TerminosPage() {
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
            <FileText className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em]">DOCUMENTO LEGAL</p>
            <h1 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold gold-text">
              Términos y Condiciones
            </h1>
          </div>
        </div>

        <p className="font-inter text-white/40 text-xs mb-10">
          Última actualización: Junio 2026
        </p>

        <div className="space-y-8 font-inter text-white/70 text-sm leading-relaxed">

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">1. Aceptación de los términos</h2>
            <p>
              Al registrarte, navegar o comprar en Dinasty Academy (en adelante, "la Plataforma"),
              aceptás en forma íntegra estos Términos y Condiciones (en adelante, "los Términos").
              Si no estás de acuerdo con alguno de los puntos, no debes usar la Plataforma. Estos
              Términos se celebran entre vos (la "Usuaria") y Dinasty Academy (el "Proveedor").
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">2. Servicio ofrecido</h2>
            <p>
              Dinasty Academy ofrece un curso online de educación para creadoras de contenido de
              plataformas como OnlyFans y Fansly. El servicio incluye: acceso al campus virtual
              con 6 módulos de contenido, material descargable complementario, soporte por WhatsApp
              y actualizaciones gratuitas del curso. El acceso al campus se otorga de por vida,
              mientras la Plataforma esté operativa, sin fecha de vencimiento.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">3. Requisitos de edad y capacidad</h2>
            <p>
              Para usar la Plataforma debés ser mayor de 18 años y tener capacidad legal. Al
              registrarte declarás bajo juramento que cumplís con este requisito. La falsificación
              de edad es motivo de cancelación inmediata de la cuenta sin reembolso.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">4. Registro y cuenta</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Para acceder al curso debés registrarte con tu nombre, email y contraseña.</li>
              <li>Sos responsable de mantener la confidencialidad de tu cuenta y contraseña.</li>
              <li>Toda actividad realizada desde tu cuenta es bajo tu responsabilidad.</li>
              <li>Te comprometés a no compartir tus credenciales ni ceder tu cuenta a terceros.</li>
              <li>Una cuenta = una persona. Detectar cuentas compartidas es motivo de suspensión sin reembolso.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">5. Precio y forma de pago</h2>
            <p>
              El precio del curso se muestra en pesos argentinos (ARS) en la página de inicio. El
              pago se procesa a través de MercadoPago, aceptando tarjetas de débito, crédito,
              transferencia y dinero en cuenta de MercadoPago. Una vez acreditado el pago, tu
              cuenta se activa automáticamente y recibís acceso inmediato al campus.
            </p>
            <p className="mt-3">
              Los precios pueden modificarse sin previo aviso. Si ya compraste el curso al precio
              anterior, no se te cobrará la diferencia. El precio publicado en el momento de la
              compra es el precio final.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">6. Entrega y acceso</h2>
            <p>
              El acceso al campus es inmediato tras la confirmación del pago. Recibirás un email
              con tus datos de ingreso en un plazo máximo de 5 a 10 minutos. Si el pago demora en
              acreditarse (por ejemplo, transferencias), podés ingresar al campus y el contenido
              se desbloqueará automáticamente cuando MercadoPago confirme la transacción.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">7. Reembolsos</h2>
            <p>
              Al tratarse de un producto digital de acceso inmediato, aplican restricciones a los
              reembolsos. La política detallada está disponible en{' '}
              <Link href="/reembolsos" className="text-amber-400 hover:underline">/reembolsos</Link>{' '}
              y forma parte integrante de estos Términos. Aceptás haberla leído antes de comprar.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">8. Protección de contenido</h2>
            <p>
              Todo el contenido del curso (videos, textos, imágenes, descargas) es propiedad
              intelectual de Dinasty Academy y está protegido por la Ley 11.723 de Propiedad
              Intelectual de Argentina y tratados internacionales. Queda estrictamente prohibido:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>Descargar, copiar o redistribuir el contenido fuera de la Plataforma.</li>
              <li>Compartir, vender o alquilar el acceso al curso a terceros.</li>
              <li>Grabar la pantalla mientras navegás el curso con fines de distribución.</li>
              <li>Usar el contenido para crear cursos competidores.</li>
            </ul>
            <p className="mt-3">
              El incumplimiento de esta cláusula es motivo de cancelación inmediata de la cuenta
              sin reembolso, y puede dar lugar a acciones legales civiles y penales por daños y
              perjuicios.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">9. Uso aceptable</h2>
            <p>Te comprometés a NO usar la Plataforma para:</p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>Actividades ilegales, fraudulentas o que vulneren derechos de terceros.</li>
              <li>Intentar hackear, atacar o sobrecargar los servidores de la Plataforma.</li>
              <li>Recopilar datos de otras usuarias (scraping, crawling).</li>
              <li>Subir contenido malicioso, virus o código dañino.</li>
              <li>Suplantar la identidad de otra persona o de Dinasty Academy.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">10. Resultados y responsabilidad</h2>
            <p>
              La Plataforma ofrece contenido educativo basado en la experiencia de su fundadora y
              de otras creadoras. Sin embargo, los resultados (ingresos, número de suscriptores,
              etc.) dependen de múltiples factores: tu esfuerzo, tu nicho, las políticas de las
              plataformas de contenido, el mercado y otros variables fuera de nuestro control.
            </p>
            <p className="mt-3">
              <strong className="text-white/90">No garantizamos</strong> resultados específicos
              ni ingresos mínimos. Lo que enseñamos son estrategias y configuraciones que han
              funcionado en casos reales, pero cada creadora es responsable de su propio proceso.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">11. Limitación de responsabilidad</h2>
            <p>
              Dinasty Academy no se hace responsable por: (a) interrupciones del servicio por
              causas técnicas o de fuerza mayor; (b) decisiones de OnlyFans, Fansly u otras
              plataformas que afecten tu cuenta (bannes, cambios de políticas, retención de
              pagos); (c) pérdidas de ingresos derivadas del uso o no uso de la Plataforma;
              (d) accesos no autorizados a tu cuenta por tu negligencia. La responsabilidad
              máxima del Proveedor se limita al monto abonado por la Usuaria al comprar el curso.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">12. Suspensión y cancelación</h2>
            <p>
              Podemos suspender o cancelar tu cuenta si: (a) incumplís estos Términos; (b) cometés
              fraude o intentás estafar a otras usuarias; (c) compartís contenido protegido; (d)
              usás la Plataforma para actividades ilegales. En caso de cancelación por incumplimiento,
              no hay reembolso.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">13. Modificaciones a los Términos</h2>
            <p>
              Podemos modificar estos Términos en cualquier momento. Las modificaciones entran en
              vigor a partir de su publicación en esta página. Te notificaremos por email sobre
              cambios significativos. El uso continuado de la Plataforma después de las
              modificaciones implica aceptación de los nuevos Términos.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">14. Legislación aplicable y jurisdicción</h2>
            <p>
              Estos Términos se rigen por las leyes de la República Argentina, en particular la
              Ley 24.240 de Defensa del Consumidor y la Ley 25.326 de Protección de Datos
              Personales. Para cualquier disputa, las partes se someten a la jurisdicción de los
              tribunales ordinarios del domicilio del Proveedor en Argentina, sin perjuicio del
              derecho de la Usuaria de iniciar reclamos ante los organismos de defensa al
              consumidor de su domicilio.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">15. Contacto</h2>
            <p>
              Para consultas sobre estos Términos, escribinos a
              <a href="mailto:dinastyacademy@gmail.com" className="text-amber-400 hover:underline"> dinastyacademy@gmail.com</a>.
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
