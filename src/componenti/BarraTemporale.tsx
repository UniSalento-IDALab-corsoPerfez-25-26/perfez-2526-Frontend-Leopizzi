// Testata della pagina (dal 29/10/2026 una riga sola): periodo con le sue frecce, etichetta dei dati della finestra,
// salto fra le finestre di riferimento e l'inquinante; sotto, l'asse. L'asse è l'intero archivio aria, suddiviso in
// anni, mesi e settimane; la finestra (al più un mese) è ciò che carta, scheda della zona e riepilogo leggono. Si apre
// sull'ultimo mese coperto da tutti i domini (28/10/2026) e si sposta trascinando, con i tasti (un giorno, una
// finestra), con il salto agli ultimi giorni o dal calendario, che apre la scelta di inizio e fine.

import { useIsFetching } from '@tanstack/react-query'
import { isValidElement, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import type { Disponibilita, PeriodoCompleto, Scenario } from '../api/client'
import { etichettaGiornoCompleto, etichettaMese, etichettaPeriodoBreve, giorniTra, mesiTra, spostaGiorno, spostaMese } from '../lib/formato'
import CalendarioPeriodo from './CalendarioPeriodo'
import { BadgeSimulato, EtichettaEspansa, StatoDato } from './comuni'
import { SceltaScenario, type Domini } from './Filtri'
import { IconaAria, IconaCalore, IconaMeseCompleto, IconaSalute, IconaStrati, IconaUltimi } from './Icone'
import { InterruttoreAnimato } from './SegmentiAnimati'

const NOMI_MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const NOMI_DOMINI: Record<string, string> = { aria: 'aria', calore: 'calore ERA5-Land', decessi: 'decessi ISTAT', simulati: 'PS e ADI simulati' }

/** Salto fra le due finestre di riferimento (28/10/2026): dall'ultimo mese con tutti i dati, con cui la pagina si apre,
 *  agli ultimi giorni d'aria; da una finestra che va oltre quel mese, di nuovo al mese completo. */
function Salto({ fine, asseA, completo, ultimi, onFinestra }: {
  fine: string
  asseA: string
  completo: PeriodoCompleto | null
  ultimi: [string, string]
  onFinestra: (da: string, a: string) => void
}) {
  const ritardi = completo?.limitato_da
    .map((d) => `${NOMI_DOMINI[d] ?? d} fino al ${etichettaGiornoCompleto(completo.fino_al[d] as string)}`).join(', ')
  // nelle testate strette resta la sola icona (il testo è nascosto dal CSS, il nome accessibile resta)
  if (completo && fine > completo.a) {
    const testo = `Vai a ${etichettaMese(completo.da.slice(0, 7))}, con tutti i dati`
    return (
      <button type="button" className="pillola barra-temporale-salto con-icona" onClick={() => onFinestra(completo.da, completo.a)} aria-label={testo}
              title={`Il mese più recente coperto per intero da tutti i domini. Dopo, c'è solo una parte dei dati: ${ritardi}`}>
        <IconaMeseCompleto /><span className="salto-testo">{testo}</span>
      </button>
    )
  }
  if (fine < asseA) {
    return (
      <button type="button" className="pillola barra-temporale-salto con-icona" onClick={() => onFinestra(ultimi[0], ultimi[1])} aria-label="Vai agli ultimi giorni"
              title={`Gli ultimi ${giorniTra(ultimi[0], ultimi[1])} giorni dell'archivio aria, fino al ${etichettaGiornoCompleto(asseA)}`
                + (ritardi ? `. Gli altri domini arrivano dopo: ${ritardi}` : '')}>
        <IconaUltimi /><span className="salto-testo">Vai agli ultimi giorni</span>
      </button>
    )
  }
  return null
}

/** Gradini di compattazione della testata (vedi app.css, «testata su una riga sola»). */
const GRADINI = 5

/** Testata su una riga sola (11/11/2026, richiesta di Matteo: prima andava a capo). Se i controlli non entrano, la barra
 *  sale di un gradino (classi stretta-1…stretta-N, cumulative: controlli più bassi, fonte in un menu, testo più piccolo,
 *  frecce e titoli tolti) e si rimisura prima che la pagina si veda; all'ultimo gradino, se ancora non entra, la riga si
 *  rimpicciolisce con `zoom`. Quando la larghezza cambia (finestra, barra laterale, chat di ONE) o cambia il filtro a
 *  destra (inquinante della Mappa, filtri di Stagionalità) si riparte dal gradino zero. Stessa idea di useCollasso. */
function useRigaUnica(chiave: unknown) {
  const sezione = useRef<HTMLElement>(null)
  const riga = useRef<HTMLDivElement>(null)
  const [gradino, setGradino] = useState(0)
  const [zoom, setZoom] = useState(1)
  const ultimaChiave = useRef(chiave)
  useEffect(() => {
    const s = sezione.current
    if (!s) return
    let larghezza = s.clientWidth
    const osservatore = new ResizeObserver(() => {
      if (Math.abs(s.clientWidth - larghezza) >= 1) { setGradino(0); setZoom(1) }
      larghezza = s.clientWidth
    })
    osservatore.observe(s)
    return () => osservatore.disconnect()
  }, [])
  useLayoutEffect(() => {
    if (ultimaChiave.current !== chiave) {
      ultimaChiave.current = chiave
      if (gradino || zoom !== 1) { setGradino(0); setZoom(1); return }
    }
    const r = riga.current
    if (!r || !r.clientWidth) return
    // si misurano i figli, non scrollWidth: i pannelli aperti (calendario, menu) sporgono ma non contano
    const box = r.getBoundingClientRect()
    const fine = Math.max(...Array.from(r.children, (c) => c.getBoundingClientRect().right))
    if (fine <= box.right + 0.5) return
    if (gradino < GRADINI) setGradino(gradino + 1)
    else if (zoom === 1) setZoom(Math.max(0.6, box.width / (fine - box.left)))
  })
  const classi = Array.from({ length: gradino }, (_, i) => ` stretta-${i + 1}`).join('')
  return { sezione, riga, classi, zoom }
}

/** Dati della finestra (29/10/2026, fase 4: prima il resoconto in una riga sotto l'asse e i domini come filtro). Un'etichetta
 *  di stato dice quanti domini hanno dati nella finestra e, mentre arrivano, gira; aperta, una riga per dominio con la
 *  copertura, l'interruttore dove nascondere un dominio cambia qualcosa (ricoveri, simulati) e lo scenario dei simulati. */
function DatiFinestra({ inizio, fine, coperti, fonti, disponibilita, domini, setDomini, scenario, setScenario }: {
  inizio: string
  fine: string
  coperti: Set<string>
  fonti: string[]
  disponibilita: Disponibilita | undefined
  domini: Domini
  setDomini: (d: Domini) => void
  scenario: Scenario
  setScenario: (s: Scenario) => void
}) {
  const [aperto, setAperto] = useState(false)
  const radice = useRef<HTMLDivElement>(null)
  const inCorso = useIsFetching()

  useEffect(() => {
    if (!aperto) return
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') setAperto(false) }
    const fuori = (e: MouseEvent) => { if (radice.current && !radice.current.contains(e.target as Node)) setAperto(false) }
    document.addEventListener('keydown', tasto)
    document.addEventListener('mousedown', fuori)
    return () => { document.removeEventListener('keydown', tasto); document.removeEventListener('mousedown', fuori) }
  }, [aperto])

  const giorni = giorniTra(inizio, fine)
  let conAria = 0
  for (let i = 0; i < giorni; i++) if (coperti.has(spostaGiorno(inizio, i))) conAria++
  const mesi = mesiTra(inizio, fine)
  const nMesi = `${mesi.length} ${mesi.length === 1 ? 'mese' : 'mesi'}`
  const dec = disponibilita?.decessi
  const conDecessi = dec ? mesi.filter((m) => m >= dec.da && m <= dec.a).length : 0
  const dim = disponibilita?.dimissioni
  const conRicoveri = !!dim && Number(fine.slice(0, 4)) >= dim.da
  const caloreMesi = new Set(disponibilita?.calore.mesi?.media ?? [])
  const conCalore = mesi.filter((m) => caloreMesi.has(m)).length
  const sim = disponibilita?.simulati
  const conSimulati = !!sim?.disponibile && !!sim.da && !!sim.a && fine >= sim.da && inizio <= sim.a

  const voci: { id: string; Icona: () => ReactNode; nome: ReactNode; ok: boolean; testo: ReactNode; nota?: string; interruttore?: keyof Domini; titolo?: string }[] = [
    { id: 'aria', Icona: IconaAria, nome: 'Aria', ok: conAria > 0, testo: `${conAria}/${giorni} giorni`, nota: fonti.length ? fonti.join(', ') : undefined },
    { id: 'decessi', Icona: IconaSalute, nome: 'Decessi', ok: conDecessi > 0, testo: `${conDecessi}/${nMesi}, per distretto`,
      nota: dec?.copertura_fino_al ? `ISTAT, fino al ${etichettaGiornoCompleto(dec.copertura_fino_al)}` : 'decessi ISTAT non scaricati' },
    { id: 'ricoveri', Icona: IconaSalute, nome: 'Ricoveri', ok: conRicoveri, testo: dim ? `annuali per provincia, fino al ${dim.a}` : 'non scaricati',
      nota: 'dimissioni ISTAT Health for All, solo informative', interruttore: 'ricoveri', titolo: 'Il blocco dei ricoveri in fondo a Stagionalità' },
    ...(sim?.disponibile ? [{
      id: 'simulati', Icona: IconaSalute, nome: <>PS e ADI <BadgeSimulato dim={15} /></>, ok: conSimulati,
      testo: sim.da && sim.a ? (conSimulati ? 'tutta la finestra' : `solo dal ${etichettaGiornoCompleto(sim.da)} al ${etichettaGiornoCompleto(sim.a)}`) : '',
      nota: 'ricoveri, pronto soccorso e ADI', interruttore: 'simulati' as const,
      titolo: 'Numeri di testa, scheda della zona, grafico sotto la carta e Riepilogo (la vista Salute della carta li contiene sempre)',
    }] : []),
    { id: 'calore', Icona: IconaCalore, nome: 'Calore', ok: conCalore > 0, testo: `${conCalore}/${nMesi}`, nota: conCalore ? 'ERA5-Land' : 'mese non ancora scaricato' },
  ]
  const presenti = voci.filter((v) => v.ok).length
  const nascosti = voci.filter((v) => v.interruttore && !domini[v.interruttore]).length
  const mancanti = voci.filter((v) => !v.ok).map((v) => v.id)
  // solo l'icona (11/11/2026, richiesta di Matteo): il riassunto («5 domini nella finestra», i nascosti) sta nel nome
  // accessibile e nel tooltip; un pallino segnala che qualche dominio manca o è nascosto
  const riassunto = `${presenti === voci.length ? `${voci.length} domini` : `${presenti} di ${voci.length} domini`} nella finestra`
    + (nascosti > 0 ? `, ${nascosti} ${nascosti === 1 ? 'nascosto' : 'nascosti'}` : '')

  return (
    <div className="dati-finestra" ref={radice}>
      <button type="button" className={`pillola dati-finestra-etichetta${inCorso ? ' in-caricamento' : ''}`} aria-haspopup="dialog" aria-expanded={aperto}
              onClick={() => setAperto((x) => !x)} aria-label={`Dati della finestra: ${riassunto}`}
              title={`${riassunto}. ${mancanti.length ? `Senza dati nella finestra: ${mancanti.join(', ')}. ` : ''}${inCorso ? 'Dati in arrivo: si vedono quelli precedenti. ' : ''}Apri per i dettagli`}>
        <span className="dati-finestra-segno" aria-hidden="true">{inCorso ? <span className="caricamento-cerchio" /> : <IconaStrati />}</span>
        {(mancanti.length > 0 || nascosti > 0) && <span className="dati-finestra-avviso" aria-hidden="true" />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">{inCorso ? 'Caricamento dei dati in corso' : ''}</span>
      {aperto && (
        <div className="dati-finestra-pannello" role="dialog" aria-label="Dati nella finestra">
          <ul>
            {voci.map((v) => (
              <li key={v.id} className={`${v.ok ? '' : 'senza-dati'}${v.id === 'simulati' ? ' riga-simulati' : ''}`}>
                <v.Icona />
                <strong>{v.nome}</strong>
                <span className="dati-finestra-copertura">
                  <span>{!v.ok && <StatoDato stato="NO_DATA" nota={v.nota} dim={15} />}{v.testo}</span>
                  {v.nota && <small>{v.nota}</small>}
                </span>
                {v.interruttore ? (
                  <InterruttoreAnimato etichetta={`Mostra ${v.id === 'simulati' ? 'PS e ADI simulati' : 'ricoveri'}`} testo="Mostra" titolo={v.titolo}
                                       attivo={domini[v.interruttore]} onCambia={() => setDomini({ ...domini, [v.interruttore!]: !domini[v.interruttore!] })} />
                ) : <span />}
                {v.id === 'simulati' && domini.simulati && (
                  <span className="dati-finestra-scenario" title="Lo scenario vale per tutta la pagina, anche per Stagionalità">
                    Scenario <SceltaScenario scenario={scenario} setScenario={setScenario} />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

/** Freccia a chevron disegnata in SVG. Il disegno è simmetrico rispetto al centro del viewBox (x e y), quindi, con
 * `display: block` e il pulsante in flex centrato, sta esattamente al centro del cerchio. */
function Freccia({ verso }: { verso: 'sinistra' | 'destra' }) {
  // un chevron largo 6 e alto 14, con la punta a sinistra o a destra
  const [base, punta] = verso === 'sinistra' ? [9, 3] : [3, 9]
  return (
    <svg width={(12 * 17) / 24} height="17" viewBox="0 0 12 24" fill="none" stroke="currentColor"
         strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: 'block' }}>
      <path d={`M${base} 5L${punta} 12L${base} 19`} />
    </svg>
  )
}

export default function BarraTemporale({ asseDa, asseA, coperti, inizio, fine, onFinestra, massima, completo, ultimi, fonti, disponibilita, domini, setDomini, scenario, setScenario, filtro }: {
  asseDa: string
  asseA: string
  coperti: Set<string>
  inizio: string
  fine: string
  onFinestra: (da: string, a: string) => void
  massima: number
  /** L'ultimo mese coperto da tutti i domini (dal server): la finestra iniziale. */
  completo: PeriodoCompleto | null
  /** Gli ultimi giorni dell'archivio aria (`finestra_predefinita`). */
  ultimi: [string, string]
  fonti: string[]
  disponibilita: Disponibilita | undefined
  domini: Domini
  setDomini: (d: Domini) => void
  /** Scenario dei dati simulati, uno per tutta la pagina: si sceglie nell'etichetta dei dati della finestra. */
  scenario: Scenario
  setScenario: (s: Scenario) => void
  /** Il filtro a destra della riga (l'inquinante), che si stringe nello spazio che resta. */
  filtro?: ReactNode
}) {
  const [aperto, setAperto] = useState(false)
  const totale = giorniTra(asseDa, asseA)
  const ampiezza = giorniTra(inizio, fine)
  const pos = (g: string) => ((giorniTra(asseDa, g) - 1) / totale) * 100

  /** Sposta la finestra perché finisca in `g`, tenendone l'ampiezza e restando nell'archivio. */
  const finisciIn = (g: string) => {
    let a = g > asseA ? asseA : g
    let da = spostaGiorno(a, -(ampiezza - 1))
    if (da < asseDa) { da = asseDa; a = spostaGiorno(da, ampiezza - 1) }
    onFinestra(da, a)
  }

  // traccia: a tratti pieni dove l'archivio copre il giorno, vuota dove c'è un buco
  const traccia = useMemo(() => {
    const tratti: string[] = []
    let corrente: boolean | null = null
    let da = 0
    const chiudi = (i: number) => {
      if (corrente === null) return
      tratti.push(`${corrente ? 'var(--testo-3)' : 'transparent'} ${(da / totale) * 100}% ${(i / totale) * 100}%`)
    }
    for (let i = 0; i < totale; i++) {
      const c = coperti.has(spostaGiorno(asseDa, i))
      if (c !== corrente) { chiudi(i); corrente = c; da = i }
    }
    chiudi(totale)
    return `linear-gradient(to right, ${tratti.join(', ')})`
  }, [asseDa, totale, coperti])

  // tacche: anni (forti, con l'anno), mesi (con il nome), settimane (lunedì, leggere)
  const tacche = useMemo(() => {
    const mesi: { g: string; anno: boolean }[] = []
    for (let m = spostaMese(asseDa.slice(0, 7), 1); `${m}-01` <= asseA; m = spostaMese(m, 1)) mesi.push({ g: `${m}-01`, anno: m.endsWith('-01') })
    const settimane: string[] = []
    const lun = (new Date(`${asseDa}T00:00:00Z`).getUTCDay() + 6) % 7
    for (let g = spostaGiorno(asseDa, (7 - lun) % 7); g <= asseA; g = spostaGiorno(g, 7)) settimane.push(g)
    return { mesi, settimane }
  }, [asseDa, asseA])

  // etichette dei mesi secondo lo spazio reale (fase 6, 29/10/2026): con la barra laterale aperta a 1280 px, o con un
  // archivio più lungo, i nomi dei mesi si toccavano. Sotto i 36 px per mese restano i trimestri (apr, lug, ott), sotto
  // i 14 px solo gli anni; le tacche restano tutte
  const etichette = useRef<HTMLDivElement>(null)
  const [larghezza, setLarghezza] = useState(0)
  useLayoutEffect(() => {
    const el = etichette.current
    if (!el) return
    const misura = () => setLarghezza(el.offsetWidth)
    misura()
    const osservatore = new ResizeObserver(misura)
    osservatore.observe(el)
    return () => osservatore.disconnect()
  }, [])
  const pxMese = larghezza / (totale / 30.44)
  const passoMesi = !larghezza || pxMese >= 36 ? 1 : pxMese >= 14 ? 3 : 12
  const mostraMese = (g: string) => (Number(g.slice(5, 7)) - 1) % passoMesi === 0

  const scoperti = ampiezza - [...Array(ampiezza).keys()].filter((i) => coperti.has(spostaGiorno(inizio, i))).length
  const { sezione, riga, classi, zoom } = useRigaUnica(isValidElement(filtro) ? filtro.type : null)

  return (
    <section className={`barra-temporale${classi}`} aria-label="Barra temporale" ref={sezione}>
      <div className="barra-temporale-testa" ref={riga} style={zoom !== 1 ? { zoom } : undefined}>
        {/* ‹ [periodo] ›: le frecce stanno ai lati del periodo e hanno il suo stesso fondo, così si leggono come pulsanti.
            Spostano di una finestra; il giorno si sposta con le frecce della tastiera sull'asse (30/10/2026: tolte le
            frecce di un giorno, la testata a 1280 px mandava NO2, O3 e SO2 in «altri…») */}
        <div className="barra-temporale-spostamento">
          <button type="button" className="pillola barra-temporale-freccia con-etichetta" onClick={() => finisciIn(spostaGiorno(fine, -ampiezza))} aria-label="Finestra precedente"><EtichettaEspansa testo="Finestra precedente" verso="destra" /><Freccia verso="sinistra" /></button>
          <div className="barra-temporale-periodo">
            {/* periodo nella forma corta, «1–30 giu 2026» (11/11/2026, richiesta di Matteo: meno spazio); il numero di
                giorni è nel tooltip e nel nome accessibile */}
            <button type="button" className="pillola barra-temporale-date" aria-haspopup="dialog" aria-expanded={aperto} onClick={() => setAperto((x) => !x)}
                    title={`${etichettaGiornoCompleto(inizio)} → ${etichettaGiornoCompleto(fine)}, ${ampiezza} ${ampiezza === 1 ? 'giorno' : 'giorni'}: clic per il calendario`}
                    aria-label={`Periodo dal ${etichettaGiornoCompleto(inizio)} al ${etichettaGiornoCompleto(fine)}, ${ampiezza} ${ampiezza === 1 ? 'giorno' : 'giorni'}: apri il calendario`}>
              {ampiezza === 1 ? etichettaGiornoCompleto(fine) : etichettaPeriodoBreve(inizio, fine)}
            </button>
            {aperto && (
              <CalendarioPeriodo asseDa={asseDa} asseA={asseA} coperti={coperti} inizio={inizio} fine={fine} massima={massima}
                                 completo={completo} onApplica={onFinestra} onChiudi={() => setAperto(false)} />
            )}
          </div>
          <button type="button" className="pillola barra-temporale-freccia con-etichetta" onClick={() => finisciIn(spostaGiorno(fine, ampiezza))} aria-label="Finestra successiva"><EtichettaEspansa testo="Finestra successiva" /><Freccia verso="destra" /></button>
        </div>
        <DatiFinestra inizio={inizio} fine={fine} coperti={coperti} fonti={fonti} disponibilita={disponibilita}
                      domini={domini} setDomini={setDomini} scenario={scenario} setScenario={setScenario} />
        <Salto fine={fine} asseA={asseA} completo={completo} ultimi={ultimi} onFinestra={onFinestra} />
        {scoperti > 0 && <p className="barra-temporale-avviso" title={`${scoperti} ${scoperti === 1 ? 'giorno' : 'giorni'} della finestra fuori dall'archivio aria`}>{scoperti} {scoperti === 1 ? 'giorno' : 'giorni'} della finestra fuori dall'archivio aria</p>}
        {filtro}
      </div>

      <div className="barra-temporale-asse">
        <div className="barra-temporale-traccia" style={{ backgroundImage: traccia }} aria-hidden="true" />
        {tacche.settimane.map((g) => <i key={g} className="tacca tacca-settimana" style={{ left: `${pos(g)}%` }} aria-hidden="true" />)}
        {tacche.mesi.map(({ g, anno }) => <i key={g} className={`tacca ${anno ? 'tacca-anno' : 'tacca-mese'}`} style={{ left: `${pos(g)}%` }} aria-hidden="true" />)}
        <div className="barra-temporale-finestra" style={{ left: `${pos(inizio)}%`, width: `${(ampiezza / totale) * 100}%` }} aria-hidden="true" />
        <input type="range" min={0} max={totale - 1} step={1} value={giorniTra(asseDa, fine) - 1}
               aria-label="Ultimo giorno della finestra" aria-valuetext={etichettaGiornoCompleto(fine)}
               onChange={(e) => finisciIn(spostaGiorno(asseDa, Number(e.target.value)))} />
      </div>
      <div className="barra-temporale-etichette" aria-hidden="true" ref={etichette}>
        <span className="etichetta-anno" style={{ left: 0 }}>{asseDa.slice(0, 4)}</span>
        {tacche.mesi.filter(({ g, anno }) => anno || mostraMese(g)).map(({ g, anno }) => (
          <span key={g} className={anno ? 'etichetta-anno' : 'etichetta-mese'} style={{ left: `${pos(g)}%` }} title={etichettaMese(g.slice(0, 7))}>
            {anno ? g.slice(0, 4) : NOMI_MESI[Number(g.slice(5, 7)) - 1]}
          </span>
        ))}
      </div>
    </section>
  )
}
