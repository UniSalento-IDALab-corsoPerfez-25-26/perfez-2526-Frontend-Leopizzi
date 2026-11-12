// Filtri (fonte, inquinante, scenario dei simulati) e zone a confronto, che stanno nella barra laterale. Il periodo non
// è un filtro: si sceglie dalla barra temporale e dal suo calendario. Dal 29/10/2026 (fase 4 della revisione) la testata
// ha una riga sola: l'inquinante sta accanto al periodo, la fonte in testa alla carta e al Riepilogo, domini e scenario
// nell'etichetta dei dati della finestra (BarraTemporale). Le voci che non entrano finiscono nel menu «altri…».

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { FONTE_ACCORPATA, type InfoFonte, type InfoInquinante, type Scenario } from '../api/client'
import { eDistretto, nomeZona, type IndiceTerritorio } from '../stato/dati'
import { coloreZona, MAX_ZONE, type ZonaScelta } from '../stato/zone'
import { Pallino } from './comuni'
import { IconaChiudi, IconaSpunta, IconaSvuota } from './Icone'
import { SegmentiAnimati } from './SegmentiAnimati'

/** `simulati` (25/10/2026): ricoveri, PS e ADI simulati, dato di partenza non reale (Dati_Simulati.md). */
/** Domini che si possono nascondere (gli altri si vedono sempre): ricoveri HFA e dati simulati. */
export interface Domini { ricoveri: boolean; simulati: boolean }

interface VoceMenu {
  id: string
  testo: ReactNode
  /** Riga piccola sotto o accanto al nome (unità, «modello», «n/d»). */
  sotto?: ReactNode
  titolo?: string
  disabilitata?: boolean
  scelta: boolean
  /** Intestazione di gruppo (come l'<optgroup>): mostrata sopra la prima voce di ogni gruppo. */
  gruppo?: string
}

/** Menu «altri…» di un filtro (14/10/2026, generalizzato il 19/10/2026): raccoglie gli inquinanti fuori dai cinque di
 *  riferimento e le voci che non entrano nella riga. Sostituisce la <select>, il cui menu nativo non si può stilizzare.
 *  Scelta singola: un clic sceglie e chiude, e se la voce scelta sta qui il pulsante ne porta il nome. Scelta multipla
 *  (domini): un clic accende o spegne la voce e il menu resta aperto. Tastiera: frecce, Invio, Esc o clic fuori. */
function MenuAltri({ voci, onScegli, etichetta, multiplo = false, classe, nomePulsante }: {
  voci: VoceMenu[]
  onScegli: (id: string) => void
  etichetta: string
  multiplo?: boolean
  classe?: string
  /** Testo del pulsante al posto di quello calcolato (es. il riassunto delle voci accese). */
  nomePulsante?: ReactNode
}) {
  const [aperto, setAperto] = useState(false)
  const contenitore = useRef<HTMLDivElement>(null)
  const pulsante = useRef<HTMLButtonElement>(null)
  const elementi = useRef<(HTMLButtonElement | null)[]>([])
  const scelte = voci.filter((v) => v.scelta)

  useEffect(() => {
    if (!aperto) return
    // all'apertura il fuoco va sulla voce scelta (o sulla prima)
    elementi.current[Math.max(0, voci.findIndex((v) => v.scelta))]?.focus()
    const fuori = (e: PointerEvent) => { if (!contenitore.current?.contains(e.target as Node)) setAperto(false) }
    document.addEventListener('pointerdown', fuori)
    return () => document.removeEventListener('pointerdown', fuori)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aperto])

  const chiudi = () => { setAperto(false); pulsante.current?.focus() }
  const tasti = (e: KeyboardEvent) => {
    const i = elementi.current.findIndex((v) => v === document.activeElement)
    const n = voci.length
    if (e.key === 'Escape') { e.preventDefault(); chiudi() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); elementi.current[(i + 1) % n]?.focus() }
    else if (e.key === 'ArrowUp') { e.preventDefault(); elementi.current[(i - 1 + n) % n]?.focus() }
    else if (e.key === 'Home') { e.preventDefault(); elementi.current[0]?.focus() }
    else if (e.key === 'End') { e.preventDefault(); elementi.current[n - 1]?.focus() }
    else if (e.key === 'Tab') setAperto(false)
  }

  // scelta singola: la voce scelta, se è qui, dà il nome al pulsante; multipla: quante voci accese stanno nel menu
  const nome = !multiplo && scelte.length ? scelte[0].testo : multiplo && scelte.length ? `altri (${scelte.length})` : 'altri…'
  return (
    <div className={`menu-altri${classe ? ` ${classe}` : ''}`} ref={contenitore} onKeyDown={aperto ? tasti : undefined}>
      <div className="segmenti">
        <button ref={pulsante} type="button" className="menu-altri-pulsante" aria-haspopup="listbox" aria-expanded={aperto}
                aria-pressed={scelte.length > 0} aria-label={etichetta}
                onClick={() => setAperto((a) => !a)}
                onKeyDown={(e) => { if (e.key === 'ArrowDown' && !aperto) { e.preventDefault(); setAperto(true) } }}>
          {nomePulsante ?? nome}
          <span className="menu-altri-freccia" aria-hidden="true" />
        </button>
      </div>
      {aperto && (
        <div className="menu-altri-pannello" role="listbox" aria-label={etichetta} aria-multiselectable={multiplo || undefined}>
          {voci.map((v, n) => (
            <Fragment key={v.id}>
              {v.gruppo && v.gruppo !== voci[n - 1]?.gruppo && <div className="menu-altri-gruppo" role="presentation">{v.gruppo}</div>}
              <button ref={(el) => { elementi.current[n] = el }} type="button" role="option" aria-selected={v.scelta}
                      aria-disabled={v.disabilitata || undefined} disabled={v.disabilitata} title={v.titolo}
                      className={multiplo ? 'voce-multipla' : undefined}
                      onClick={() => { onScegli(v.id); if (!multiplo) chiudi() }}>
                <span className="voce-menu">
                  {multiplo && <span className="spunta-menu" aria-hidden="true">{v.scelta && <IconaSpunta dim={14} />}</span>}
                  {v.testo}
                </span>
                {v.sotto && <small>{v.sotto}</small>}
              </button>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  )
}

/** Menu a scelta singola al posto della <select> nativa (28/10/2026, richiesta di Matteo): stesso pulsante e stesso
 *  pannello dei filtri della pagina principale. Il pulsante porta il nome della voce scelta. */
export function MenuSelezione({ voci, valore, onScegli, etichetta, classe }: {
  voci: { id: string; testo: ReactNode; gruppo?: string }[]
  valore: string
  onScegli: (id: string) => void
  etichetta: string
  classe?: string
}) {
  return (
    <MenuAltri etichetta={etichetta} onScegli={onScegli} classe={`menu-selezione${classe ? ` ${classe}` : ''}`}
               voci={voci.map((v) => ({ ...v, scelta: v.id === valore }))} />
  )
}

/** Un filtro che si stringe nello spazio che ha (29/10/2026, testata a una riga): se la barra non entra nel suo spazio,
 *  l'ultima voce non scelta passa nel menu «altri…» e si ridisegna, prima che la pagina si veda (niente sfarfallio).
 *  Lo spazio è del contenitore, che prende la larghezza lasciata dagli altri controlli e non dipende dalle voci: se
 *  cambia (finestra, barra laterale) si riparte con tutte le voci in vista. Prende il posto di useRigaCollassabile. */
function useCollasso(voci: { id: string; scelta: boolean }[]) {
  const spazio = useRef<HTMLDivElement>(null)
  const barra = useRef<HTMLDivElement>(null)
  const [collassate, setCollassate] = useState<string[]>([])
  const firma = voci.map((v) => v.id).join(',')
  useEffect(() => setCollassate([]), [firma])
  useEffect(() => {
    const s = spazio.current
    if (!s) return
    let larghezza = s.clientWidth
    const osservatore = new ResizeObserver(() => {
      if (Math.abs(s.clientWidth - larghezza) >= 1) setCollassate([])
      larghezza = s.clientWidth
    })
    osservatore.observe(s)
    return () => osservatore.disconnect()
  }, [])
  useLayoutEffect(() => {
    const s = spazio.current
    const b = barra.current
    if (!s || !b || !s.clientWidth || b.offsetWidth <= s.clientWidth + 0.5) return
    // la voce scelta resta sempre in vista
    const voce = voci.filter((v) => !v.scelta && !collassate.includes(v.id)).at(-1)
    if (voce) setCollassate((p) => [...p, voce.id])
  })
  return { spazio, barra, collassate }
}

/** Scelta dello scenario dei dati simulati: uno per tutta la pagina, come la finestra temporale. */
export function SceltaScenario({ scenario, setScenario, classe = 'segmenti-piccoli' }: { scenario: Scenario; setScenario: (s: Scenario) => void; classe?: string }) {
  return (
    <SegmentiAnimati classe={classe} etichetta="Scenario dei dati simulati" valore={scenario} onScegli={setScenario}
                     opzioni={[
                       { id: 'letteratura', testo: 'letteratura', titolo: "Scenario «letteratura»: effetto di PM10, NO2 e caldo con i coefficienti della letteratura (EpiAir2, Michelozzi 2009), imposto da noi. È lo scenario usato in tesi" },
                       { id: 'nullo', testo: 'nullo', titolo: 'Scenario «nullo»: solo popolazione, stagione e caso, nessun effetto di aria e caldo' },
                     ]} />
  )
}

/** Fonte dei dati dell'aria (29/10/2026: in testa alla carta e al Riepilogo, non più nella testata). «Tutte» (media delle
 *  fonti concordi) è la prima voce; la fonte modellata (CAMS) porta «modello» sotto il nome. */
export function FiltroFonte({ fonti: fontiRicevute, fonte, setFonte }: { fonti: InfoFonte[]; fonte: string; setFonte: (f: string) => void }) {
  const fonti = [...fontiRicevute].sort((a, b) => Number(b.nome === FONTE_ACCORPATA) - Number(a.nome === FONTE_ACCORPATA))
  const { spazio, barra, collassate } = useCollasso(fonti.map((f) => ({ id: f.nome, scelta: f.nome === fonte })))
  const titolo = (f: InfoFonte) => (f.nome === FONTE_ACCORPATA
    ? 'Media delle fonti concordi per comune e giorno: scartata la fonte che si discosta troppo dalle altre; ARPA solo per PM10 e PM2.5 (per gli altri pubblica il massimo). Dove non ci sono stazioni resta CAMS, modellato. Lettura di sintesi: il dato resta per fonte'
    : f.modellata ? 'Modello su griglia di circa 10 km: dà un valore a ogni comune, anche dove non ci sono stazioni, ma non è una misura'
    : `Licenza: ${f.licenza}`)
  const nome = (f: InfoFonte) => (f.nome === FONTE_ACCORPATA ? 'Tutte' : f.nome)
  const sotto = (f: InfoFonte) => (f.modellata ? 'modello' : undefined)
  const inMenu = fonti.filter((f) => collassate.includes(f.nome))
  return (
    <div className="filtro-spazio" ref={spazio}>
      <div className="filtro" ref={barra}>
        <span className="filtro-nome">Fonte</span>
        {fonti.length === 0 ? <span className="filtro-attesa">…</span> : (
          <div className="filtro-controlli">
            <SegmentiAnimati classe="segmenti-fonte" etichetta="Fonte dei dati dell'aria: una alla volta, oppure tutte le fonti concordi"
                             valore={fonte} onScegli={setFonte}
                             opzioni={fonti.filter((f) => !collassate.includes(f.nome)).map((f) => ({
                               id: f.nome, titolo: titolo(f),
                               testo: <span className="fonte-etichetta">{nome(f)}{sotto(f) && <small>{sotto(f)}</small>}</span>,
                             }))} />
            {inMenu.length > 0 && (
              <MenuAltri etichetta="Altre fonti" onScegli={setFonte}
                         voci={inMenu.map((f) => ({ id: f.nome, titolo: titolo(f), sotto: sotto(f), scelta: f.nome === fonte, testo: nome(f) }))} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/** Inquinante, nella riga della testata accanto al periodo (29/10/2026): i cinque di riferimento in vista finché entrano,
 *  gli altri nel menu «altri…». */
export function FiltroInquinante({ inquinanti, inquinante, setInquinante }: { inquinanti: InfoInquinante[]; inquinante: string; setInquinante: (i: string) => void }) {
  const riferimento = inquinanti.filter((i) => i.riferimento)
  const altri = inquinanti.filter((i) => !i.riferimento)
  const { spazio, barra, collassate } = useCollasso(riferimento.map((i) => ({ id: i.id, scelta: i.id === inquinante })))
  const inMenu = [...riferimento.filter((i) => collassate.includes(i.id)), ...altri]
  return (
    <div className="filtro-spazio" ref={spazio}>
      <div className="filtro" ref={barra}>
        <span className="filtro-nome">Inquinante</span>
        {riferimento.length === 0 ? <span className="filtro-attesa">…</span> : (
          <div className="filtro-controlli">
            <SegmentiAnimati etichetta="Inquinante" valore={inquinante} onScegli={setInquinante}
                             opzioni={riferimento.filter((i) => !collassate.includes(i.id)).map((i) => ({ id: i.id, testo: i.id, titolo: i.descrizione ?? undefined }))} />
            {inMenu.length > 0 && (
              <MenuAltri etichetta="Altri inquinanti" onScegli={setInquinante}
                         voci={inMenu.map((i) => ({ id: i.id, testo: i.id, sotto: i.unita ?? undefined, titolo: i.descrizione ?? undefined, scelta: i.id === inquinante }))} />
            )}
          </div>
        )}
      </div>
    </div>
  )
}


export function ZoneAConfronto({ zone, focus, indice, piena, onTogli, onFocus, onSvuota }: {
  zone: ZonaScelta[]
  focus: string | null
  indice: IndiceTerritorio | null
  piena: boolean
  onTogli: (id: string) => void
  onFocus: (id: string) => void
  onSvuota: () => void
}) {
  // elenco compatto (19/10/2026): una riga sottile per zona con pallino, nome e ×; la zona in primo piano è in grassetto
  // e nel colore pieno del testo. Prima: pillole chiare grandi, che pesavano più delle tab.
  return (
    <section className="zone-confronto" aria-label="Zone a confronto" aria-live="polite">
      <div className="zone-testa">
        <span className="zone-titolo">Zone a confronto <small>{zone.length}/{MAX_ZONE}</small></span>
        {zone.length > 0 && (
          <button type="button" className="zone-svuota" onClick={onSvuota} aria-label="Svuota il confronto" title="Togli tutte le zone dal confronto">
            <IconaSvuota dim={15} />
          </button>
        )}
      </div>
      {zone.length > 0 && (
        <ul className="zone-elenco">
          {zone.map((z) => (
            <li key={z.id} className={`zona-riga${focus === z.id ? ' zona-riga-focus' : ''}`}>
              <button type="button" className="zona-nome" onClick={() => onFocus(z.id)} aria-current={focus === z.id || undefined}
                      title={focus === z.id ? 'In primo piano nel pannello della zona' : 'Metti in primo piano'}>
                <Pallino colore={coloreZona(z.slot)} />
                <span>{nomeZona(indice, z.id)}</span>
              </button>
              <button type="button" className="zona-togli" onClick={() => onTogli(z.id)} aria-label={`Togli ${nomeZona(indice, z.id)} dal confronto`}>
                <IconaChiudi dim={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {piena ? <p className="suggerimento suggerimento-attenzione">Già {MAX_ZONE} zone: togline una per aggiungerne un'altra.</p>
        : zone.length < MAX_ZONE && <p className="suggerimento">Aggiungine una dalla sua scheda sulla carta.</p>}
    </section>
  )
}

/** Sigla di una zona nel suo pallino: il numero del distretto, o le prime due lettere del comune. */
function sigla(indice: IndiceTerritorio | null, id: string) {
  if (eDistretto(id)) return indice?.distretti.get(id)?.denominazione.replace(/\D/g, '') || id.slice(3)
  const nome = indice?.comuni.get(id)?.denominazione ?? id
  return nome.slice(0, 2)
}

/** Zone a confronto con la barra laterale chiusa (29/10/2026, scelta di Matteo): un pallino per zona, contornato nel
 *  suo colore e con la sigla; pieno al 30% quella in primo piano. Clic = in primo piano; nome e «togli» nel tooltip e
 *  nel nome accessibile (si toglie riaprendo la barra o dalla carta). */
export function ZonePallini({ zone, focus, indice, onFocus }: {
  zone: ZonaScelta[]
  focus: string | null
  indice: IndiceTerritorio | null
  onFocus: (id: string) => void
}) {
  if (!zone.length) return null
  return (
    <ul className="zone-pallini" aria-label="Zone a confronto">
      {zone.map((z) => {
        const nome = nomeZona(indice, z.id)
        return (
          <li key={z.id}>
            <button type="button" className={`zona-pallino${focus === z.id ? ' zona-pallino-focus' : ''}`} style={{ ['--c' as string]: coloreZona(z.slot) }}
                    onClick={() => onFocus(z.id)} aria-current={focus === z.id || undefined}
                    aria-label={`${nome}${focus === z.id ? ', in primo piano' : ''}`} title={`${nome}: ${focus === z.id ? 'in primo piano' : 'clic per metterla in primo piano'}. Si toglie dalla barra aperta o dalla sua scheda sulla carta`}>
              {sigla(indice, z.id)}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
