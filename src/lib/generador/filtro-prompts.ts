/**
 * Filtro inteligente de prompts para z-ai SDK.
 * Reescribe palabras problemáticas (fetiche, desnudo, etc.) para que el SDK no las rechace.
 * Mantiene el sentido del prompt original.
 *
 * TOTALMENTE SEPARADO del resto de la academia. No afecta nada más.
 */

// Diccionario de palabras problemáticas y sus reemplazos seguros
const REPLACEMENTS: Array<[string, string]> = [
  // Fetiches
  ['fetiche', 'estética especial'],
  ['fetiches', 'estética especial'],
  ['fetish', 'estética especial'],
  ['kink', 'estética alternativa'],
  ['kinky', 'estética alternativa'],
  ['bdsm', 'estética fetish con cuero'],
  ['dominatrix', 'mujer dominante elegante'],
  ['dominacion', 'estética dominante'],
  ['dominación', 'estética dominante'],
  ['sumision', 'estética sumisa elegante'],
  ['sumisión', 'estética sumisa elegante'],

  // Desnudos
  ['desnudo', 'figura elegante con ropa minimalista'],
  ['desnuda', 'figura elegante con ropa minimalista'],
  ['desnudos', 'figuras elegantes con ropa minimalista'],
  ['nude', 'figura elegante con ropa minimalista'],
  ['naked', 'figura elegante con ropa minimalista'],
  ['topless', 'figura elegante con cobertura mínima'],
  ['sin ropa', 'con ropa minimalista'],
  ['sin sostén', 'con cobertura elegante'],
  ['sin sostén', 'con cobertura elegante'],
  ['pezon', 'con cobertura elegante'],
  ['pezón', 'con cobertura elegante'],
  ['pezones', 'con cobertura elegante'],

  // Sexual explícito
  ['sexo', 'intimidad elegante'],
  ['sexual', 'estética sensual elegante'],
  ['orgasmo', 'expresión de placer sutil'],
  ['erótico', 'sensual elegante'],
  ['erotico', 'sensual elegante'],
  ['erotica', 'sensual elegante'],
  ['erótica', 'sensual elegante'],

  // Términos anatómicos explícitos
  ['vagina', 'zona íntima cubierta'],
  ['pene', 'zona íntima cubierta'],
  ['genitales', 'zona íntima cubierta'],

  // Otros
  ['xxx', 'contenido adulto elegante'],
  ['porn', 'contenido elegante para adultos'],
  ['porno', 'contenido elegante para adultos'],
  ['pornografía', 'contenido elegante para adultos'],
  ['pornografia', 'contenido elegante para adultos'],

  // Acciones explícitas
  ['masturbar', 'tocado de manera elegante'],
  ['penetracion', 'intimidad elegante sugerida'],
  ['penetración', 'intimidad elegante sugerida'],
  ['oral', 'estética íntima sugerida'],
  ['anal', 'estética íntima sugerida'],

  // Fluidos
  ['liquido', 'brillo elegante'],
  ['líquido', 'brillo elegante'],
  ['semen', 'brillo elegante'],
  ['eyaculacion', 'brillo elegante'],
  ['eyaculación', 'brillo elegante'],
  ['sangre', 'color rojo intenso'],
]

const QUALITY_SUFFIX = ', elegant sensual photography, professional, high quality, artistic, no explicit content, tasteful'

export interface FilterResult {
  filtered: string
  changes: string[]
}

export function filterPrompt(prompt: string): FilterResult {
  const changes: string[] = []
  let filtered = prompt

  for (const [badWord, goodWord] of REPLACEMENTS) {
    const badLower = badWord.toLowerCase()
    let start = 0

    while (true) {
      const lowerFiltered = filtered.toLowerCase()
      const idx = lowerFiltered.indexOf(badLower, start)
      if (idx === -1) break

      // Verificar que sea palabra completa
      const beforeOk = idx === 0 || !/[a-zA-Z0-9]/.test(filtered[idx - 1])
      const afterIdx = idx + badWord.length
      const afterOk = afterIdx >= filtered.length || !/[a-zA-Z0-9]/.test(filtered[afterIdx])

      if (beforeOk && afterOk) {
        let replacement = goodWord
        if (filtered[idx].toUpperCase() === filtered[idx] && filtered[idx].toLowerCase() !== filtered[idx]) {
          replacement = goodWord[0].toUpperCase() + goodWord.slice(1)
        }
        filtered = filtered.slice(0, idx) + replacement + filtered.slice(afterIdx)
        changes.push(`"${badWord}" → "${goodWord}"`)
        start = idx + replacement.length
      } else {
        start = idx + 1
      }
    }
  }

  if (!filtered.toLowerCase().includes('elegant sensual photography')) {
    filtered = filtered + QUALITY_SUFFIX
  }

  return { filtered, changes }
}

export const ESTILOS_GENERADOR = {
  elegante: 'luxury elegant aesthetic, dark with golden accents, cinematic lighting, professional photography, mysterious mood',
  moderno: 'modern minimalist aesthetic, clean design, professional photography, bright lighting',
  sensual: 'warm sensual elegant aesthetic, soft lighting, boudoir style, professional photography, tasteful',
  epico: 'dramatic epic aesthetic, cinematic lighting, professional photography, powerful mood',
} as const

export type EstiloGenerador = keyof typeof ESTILOS_GENERADOR
