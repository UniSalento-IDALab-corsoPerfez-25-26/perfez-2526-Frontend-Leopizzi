import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/**
 * Suggerimenti al passaggio del puntatore nello stile della dashboard (05/11/2026, scelta di Matteo).
 *
 * Il riquadro nativo del browser, quello degli attributi `title`, non si può stilizzare. Questo componente, montato
 * una volta sola, ascolta tutta la pagina: quando il puntatore (o il focus da tastiera) arriva su un elemento con un
 * `title`, ne toglie l'attributo, così il browser non mostra il suo riquadro, e dopo ATTESA_MS ne mostra uno proprio con
 * lo stesso testo. All'uscita rimette l'attributo dov'era. Non si cambia nessun `title=` del codice, e quelli futuri
 * sono coperti da subito. Lo stile è `.tooltip-titolo` in app.css.
 */

const ATTESA_MS = 500
const SCARTO = 14
const MARGINE = 8

interface Aperto { testo: string; x: number; y: number }

export default function TooltipTitoli() {
  const [aperto, setAperto] = useState<Aperto | null>(null)
  const [posizione, setPosizione] = useState<{ left: number; top: number }>({ left: 0, top: 0 })
  const riquadro = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let elemento: HTMLElement | null = null
    let testo = ''
    let timer = 0
    let x = 0
    let y = 0

    const nascondi = () => {
      window.clearTimeout(timer)
      setAperto(null)
    }
    // rimette il `title` tolto (se nel frattempo React non ne ha già messo uno nuovo)
    const chiudi = () => {
      nascondi()
      if (elemento && !elemento.hasAttribute('title')) elemento.setAttribute('title', testo)
      elemento = null
    }
    const attiva = (bersaglio: EventTarget | null, daTastiera: boolean) => {
      if (!(bersaglio instanceof Element)) return
      const nuovo = bersaglio.closest<HTMLElement>('[title]')
      if (nuovo) {
        if (nuovo === elemento) return
        chiudi()
        const t = nuovo.getAttribute('title')?.trim()
        if (!t) return
        elemento = nuovo
        testo = t
        nuovo.removeAttribute('title')
        if (daTastiera) {
          const r = nuovo.getBoundingClientRect()
          x = r.left
          y = r.bottom - SCARTO + 6
        }
        timer = window.setTimeout(() => setAperto({ testo: t, x, y }), ATTESA_MS)
      } else if (!elemento || !elemento.contains(bersaglio)) {
        chiudi()
      }
    }

    const suPuntatore = (e: PointerEvent) => { if (e.pointerType === 'mouse') { x = e.clientX; y = e.clientY; attiva(e.target, false) } }
    const suMovimento = (e: PointerEvent) => { if (e.pointerType === 'mouse') { x = e.clientX; y = e.clientY } }
    const suUscita = (e: PointerEvent) => {
      if (elemento && !(e.relatedTarget instanceof Node && elemento.contains(e.relatedTarget))) chiudi()
    }
    const suFocus = (e: FocusEvent) => {
      if (e.target instanceof Element && e.target.matches(':focus-visible')) attiva(e.target, true)
    }
    const suTasto = (e: KeyboardEvent) => { if (e.key === 'Escape') nascondi() }

    document.addEventListener('pointerover', suPuntatore)
    document.addEventListener('pointermove', suMovimento)
    document.addEventListener('pointerout', suUscita)
    document.addEventListener('pointerdown', nascondi)
    document.addEventListener('focusin', suFocus)
    document.addEventListener('focusout', chiudi)
    document.addEventListener('keydown', suTasto)
    window.addEventListener('scroll', nascondi, true)
    window.addEventListener('blur', chiudi)
    return () => {
      chiudi()
      document.removeEventListener('pointerover', suPuntatore)
      document.removeEventListener('pointermove', suMovimento)
      document.removeEventListener('pointerout', suUscita)
      document.removeEventListener('pointerdown', nascondi)
      document.removeEventListener('focusin', suFocus)
      document.removeEventListener('focusout', chiudi)
      document.removeEventListener('keydown', suTasto)
      window.removeEventListener('scroll', nascondi, true)
      window.removeEventListener('blur', chiudi)
    }
  }, [])

  // di lato al puntatore, sempre dentro la finestra: se non c'è spazio a destra o sotto, passa a sinistra o sopra
  useLayoutEffect(() => {
    const r = riquadro.current
    if (!aperto || !r) return
    const { width: w, height: h } = r.getBoundingClientRect()
    let left = aperto.x + SCARTO
    let top = aperto.y + SCARTO
    if (left + w > window.innerWidth - MARGINE) left = aperto.x - SCARTO - w
    if (top + h > window.innerHeight - MARGINE) top = aperto.y - SCARTO - h
    setPosizione({ left: Math.max(MARGINE, left), top: Math.max(MARGINE, top) })
  }, [aperto])

  if (!aperto) return null
  return (
    <div ref={riquadro} className="tooltip-titolo" role="tooltip" style={{ left: posizione.left, top: posizione.top }}>
      {aperto.testo}
    </div>
  )
}
