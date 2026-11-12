// Segmenti dello stesso stile dei filtri (.segmenti) con la voce attiva su un indicatore che scorre da un pulsante
// all'altro, invece di accendersi di colpo (14/10/2026). L'indicatore è un elemento unico posizionato sul pulsante
// scelto: si sposta e si allarga/stringe con una transizione sola, quindi anche fra voci di larghezza diversa il
// movimento resta continuo. Rispetta prefers-reduced-motion (v. app.css).

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { IconaSpunta } from './Icone'

interface OpzioneSegmento<T extends string> {
  id: T
  testo: ReactNode
  titolo?: string
  disabilitata?: boolean
}

export function SegmentiAnimati<T extends string>({ valore, opzioni, onScegli, etichetta, classe = '' }: {
  /** Voce scelta; se non è fra le opzioni (es. un inquinante del menu «altri…») l'indicatore si dissolve. */
  valore: T
  opzioni: OpzioneSegmento<T>[]
  onScegli: (id: T) => void
  etichetta: string
  /** Classi in più sul contenitore (es. segmenti-piccoli, segmenti-fonte). */
  classe?: string
}) {
  const contenitore = useRef<HTMLDivElement>(null)
  const pulsanti = useRef(new Map<T, HTMLButtonElement>())
  const [pos, setPos] = useState<{ x: number; w: number; visibile: boolean } | null>(null)
  // l'indicatore scorre solo quando cambia la scelta; quando cambia l'impaginazione (prima misura, font, larghezza,
  // voci spostate nel menu «altri…») va al suo posto senza animazione, altrimenti scivolerebbe da solo
  const [anima, setAnima] = useState(false)
  const ultimo = useRef<T | null>(null)
  const posizione = useRef<{ x: number; w: number; visibile: boolean } | null>(null)

  useLayoutEffect(() => {
    const cambiata = ultimo.current !== null && ultimo.current !== valore
    ultimo.current = valore
    const misura = (animata: boolean) => () => {
      const b = pulsanti.current.get(valore)
      // fuori dalle opzioni l'indicatore resta dov'era e si dissolve, invece di saltare a sinistra
      const p = posizione.current
      const nuova = b ? { x: b.offsetLeft, w: b.offsetWidth, visibile: true } : p ? { ...p, visibile: false } : null
      // l'osservatore si richiama anche appena collegato: se la posizione non cambia non tocca l'animazione in corso
      if (!animata && p && nuova && p.x === nuova.x && p.w === nuova.w && p.visibile === nuova.visibile) return
      posizione.current = nuova
      setAnima(animata)
      setPos(nuova)
    }
    misura(cambiata)()
    const osservatore = new ResizeObserver(misura(false)) // font caricato, tema o larghezza diversi
    if (contenitore.current) osservatore.observe(contenitore.current)
    pulsanti.current.forEach((b) => osservatore.observe(b))
    return () => osservatore.disconnect()
  }, [valore, opzioni.length])

  return (
    <div ref={contenitore} className={`segmenti segmenti-animati ${classe}`} role="group" aria-label={etichetta}>
      <span className={`segmenti-indicatore${anima ? ' segmenti-indicatore-pronto' : ''}`} aria-hidden="true"
            style={pos ? { transform: `translateX(${pos.x}px)`, width: pos.w, opacity: pos.visibile ? 1 : 0 } : { opacity: 0 }} />
      {opzioni.map((o) => (
        <button key={o.id} ref={(el) => { if (el) pulsanti.current.set(o.id, el); else pulsanti.current.delete(o.id) }}
                type="button" aria-pressed={valore === o.id} disabled={o.disabilitata} title={o.titolo}
                onClick={() => onScegli(o.id)}>
          {o.testo}
        </button>
      ))}
    </div>
  )
}

/** Un solo pulsante acceso/spento (es. Stazioni): lo stesso indicatore compare e scompare dissolvendosi e crescendo. */
export function InterruttoreAnimato({ attivo, disabilitato, onCambia, testo, titolo, etichetta }: {
  attivo: boolean
  disabilitato?: boolean
  onCambia: () => void
  testo: ReactNode
  titolo?: string
  etichetta: string
}) {
  return (
    <div className="segmenti segmenti-animati segmenti-interruttore" role="group" aria-label={etichetta}>
      <span className={`segmenti-indicatore segmenti-indicatore-pronto segmenti-interruttore-fondo${attivo ? ' acceso' : ''}`}
            aria-hidden="true" />
      <button type="button" aria-pressed={attivo} disabled={disabilitato} title={titolo} onClick={onCambia}>
        <span className="spunta" aria-hidden="true"><IconaSpunta dim={14} /></span>{testo}
      </button>
    </div>
  )
}
