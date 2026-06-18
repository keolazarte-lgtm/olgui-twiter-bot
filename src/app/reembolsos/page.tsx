import type { Metadata } from 'next'
import Link from 'next/link'
import { Crown, ArrowLeft, RefreshCw } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Política de Reembolsos — Dinasty Academy',
  description: 'Política de devoluciones y reembolsos de Dinasty Academy.',
}

export default function ReembolsosPage() {
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
            <RefreshCw className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-cinzel text-amber-500/50 text-xs tracking-[0.3em]">DOCUMENTO LEGAL</p>
            <h1 className="font-cinzel-decorative text-2xl sm:text-3xl font-bold gold-text">
              Política de Reembolsos
            </h1>
          </div>
        </div>

        <p className="font-inter text-white/40 text-xs mb-10">
          Última actualización: Junio 2026
        </p>

        <div className="space-y-8 font-inter text-white/70 text-sm leading-relaxed">

          <section className="bg-amber-500/5 border border-amber-500/15 rounded-lg p-5">
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">Resumen rápido</h2>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Producto digital con acceso inmediato al campus.</li>
              <li><strong className="text-white/90">Reembolso del 100%</strong> dentro de las primeras <strong className="text-white/90">24 horas</strong> si no ingresaste al campus.</li>
              <li><strong className="text-white/90">Reembolso del 50%</strong> entre 24 y 72 horas, si no consumiste más del 20% del contenido.</li>
              <li>Después de 72 horas o consumido más del 20% del contenido: no hay reembolso.</li>
              <li>Procesamos el reembolso por el mismo medio de pago (MercadoPago), en hasta 10 días hábiles.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">1. Naturaleza del producto</h2>
            <p>
              Dinasty Academy vende un producto digital: acceso a un campus online con material
              educativo. Al comprar, recibís acceso inmediato y completo al contenido, lo cual
              imposibilita la "devolución" del producto en el sentido físico. Por esto, y de
              acuerdo con el artículo 34 de la Ley 24.240 de Defensa al Consumidor (que exceptúa
              de la garantía de devolución a los productos digitales consumibles por vía digital),
              aplicamos las siguientes reglas de reembolso.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">2. Reembolso del 100% (primeras 24 horas)</h2>
            <p>
              Si solicitás el reembolso dentro de las <strong className="text-white/90">24 horas
              siguientes a tu compra</strong> y <strong className="text-white/90">no ingresaste
              al campus</strong> (no abriste ninguna lección), te devolvemos el 100% del monto
              pagado. Para solicitarlo, escribinos a dinastyacademy@gmail.com con el asunto
              "Reembolso" e indicando el email con el que te registraste.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">3. Reembolso del 50% (24 a 72 horas)</h2>
            <p>
              Si solicitás el reembolso entre las 24 y 72 horas posteriores a tu compra, y siempre
              que no hayas consumido más del <strong className="text-white/90">20% del contenido
              total del curso</strong>, te devolvemos el 50% del monto pagado. El 50% restante
              retiene para cubrir costos administrativos y de procesamiento de pago.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">4. Sin reembolso (después de 72 horas o uso avanzado)</h2>
            <p>
              No procede el reembolso en los siguientes casos:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>Han pasado más de 72 horas desde tu compra.</li>
              <li>Consumiste más del 20% del contenido total del curso.</li>
              <li>Descargaste material complementario (PDFs, guías, etc.).</li>
              <li>Compartiste tu cuenta con terceros o violaste los Términos y Condiciones.</li>
              <li>El motivo del reembolso es "no me gustó el contenido" o "cambié de opinión" después de 72 horas.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">5. Casos especiales</h2>
            <p>
              En los siguientes casos, evaluamos el reembolso de forma excepcional, fuera de los
              plazos anteriores:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li><strong className="text-white/90">Falla técnica:</strong> si no podés acceder al campus por un problema técnico nuestro y no lo resolvimos en 48 horas.</li>
              <li><strong className="text-white/90">Doble cobro:</strong> si te cobramos dos veces por error, devolvemos el segundo cobro en su totalidad.</li>
              <li><strong className="text-white/90">Cuenta bloqueada sin causa:</strong> si bloqueamos tu cuenta por error, devolvemos el monto proporcional al tiempo sin acceso.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">6. Cómo solicitar el reembolso</h2>
            <p>
              Escribinos a
              <a href="mailto:dinastyacademy@gmail.com" className="text-amber-400 hover:underline"> dinastyacademy@gmail.com</a>
              {' '}con la siguiente información:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2 mt-2">
              <li>Asunto: "Reembolso"</li>
              <li>Email con el que te registraste</li>
              <li>Fecha aproximada de la compra</li>
              <li>Motivo del reembolso (breve, no más de 3 líneas)</li>
            </ul>
            <p className="mt-3">
              Te responderemos dentro de las <strong className="text-white/90">48 horas hábiles</strong>{' '}
              indicándote si tu solicitud fue aprobada y, en caso afirmativo, el plazo estimado
              de acreditación.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">7. Procesamiento del reembolso</h2>
            <p>
              Los reembolsos se procesan por el mismo medio de pago utilizado en la compra
              (MercadoPago). El plazo de acreditación depende de MercadoPago y de tu banco, pero
              suele ser de entre 5 y 10 días hábiles. No nos hacemos responsables por demoras
              imputables a MercadoPago o a tu banco.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">8. Reembolsos por fraude o abuso</h2>
            <p>
              Si detectamos patrones de abuso (por ejemplo, comprar el curso, consumirlo completo,
              y pedir reembolso repetidamente), nos reservamos el derecho de rechazar el reembolso
              y bloquear la cuenta. Si hiciste un reembolso por MercadoPago y posteriormente
              seguís usando el contenido, eso constituye fraude y podemos tomar acciones legales.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">9. Reclamos ante MercadoPago</h2>
            <p>
              Si abrís un reclamo o disputa directamente en MercadoPago sin haber intentado
              resolver el problema con nosotros primero, te pediremos que canceles el reclamo y
              inicies el proceso por el canal de email. Abrir disputas sin motivo válido puede
              resultar en el bloqueo de tu cuenta de MercadoPago, según sus propias políticas.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">10. Defensa al consumidor</h2>
            <p>
              Si no estás conforme con nuestra respuesta, tenés derecho a presentar un reclamo
              ante la Dirección Nacional de Defensa al Consumidor (argentina.gob.ar/produccion/defensadelconsumidor)
              o ante los organismos provinciales de tu jurisdicción. Esta política no restringe
              tus derechos irrenunciables como consumidora bajo la Ley 24.240.
            </p>
          </section>

          <section>
            <h2 className="font-cinzel text-amber-400 text-lg mb-3">11. Contacto</h2>
            <p>
              Para consultas sobre reembolsos, escribinos a
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
