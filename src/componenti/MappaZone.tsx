// Mappa dei distretti socio-sanitari (o dei comuni) colorata con il valore del mese dell'inquinante scelto,
// per una sola fonte, oppure con la salubrità, la temperatura o uno dei due fattori di mitigazione CLMS (chioma
// arborea, suolo impermeabile: attributi statici dell'anagrafica, non legati alla finestra). Base: tile OpenStreetMap
// standard, senza chiave né quota (repository Backend, docs/Architettura.md), con l'attribuzione ODbL obbligatoria. I nomi sono quelli dei comuni,
// disegnati da noi (NomiComuni.tsx, 28/10/2026). Il Salento si stacca dalla base (28/10/2026, «carta del territorio»):
// fuori dai confini la base è velata, i poligoni hanno colori pieni e un'ombra sotto la sagoma, la zona scelta si
// solleva con un'ombra più netta. Clic su una zona = dettaglio, doppio clic = confronto. A sinistra della carta poggia
// il cuore della zona (DettaglioZona.tsx): il Salento si inquadra nel resto e lo zoom sta a destra.

import L, { type Layer, type PathOptions } from 'leaflet'
import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { CircleMarker, GeoJSON, MapContainer, Marker, Pane, Polygon, TileLayer, ZoomControl, useMap } from 'react-leaflet'

import { FONTE_ACCORPATA, type AriaMese, type Banda, type CaloreMappa, type CellaMensile, type Confini, type ProprietaComune, type ProprietaDistretto, type SalubritaMappa, type SaluteMappa } from '../api/client'
import { numero } from '../lib/formato'
import { ETICHETTA_BANDA } from '../lib/salubrita'
import { eDistretto, nomeZona, type IndiceTerritorio } from '../stato/dati'
import { useTema, type Token } from '../stato/token'
import type { ZonaScelta } from '../stato/zone'
import { ETICHETTA_STATO } from './comuni'
import NomiComuni from './NomiComuni'

export type Livello = 'distretti' | 'comuni'
export type ModoMappa = 'valore' | 'salubrita' | 'temperatura' | 'alberi' | 'suolo' | 'salute'

/** Viste dei fattori di mitigazione: campo dell'anagrafica, rampa di colore e nota della fonte. */
export const MITIGAZIONE = {
  alberi: { campo: 'copertura_arborea_pct', rampa: 'alberi', titolo: 'Copertura arborea',
            nota: 'CLMS Tree Cover Density 2024 (10 m): % media di chioma sul comune, uliveti compresi' },
  suolo: { campo: 'suolo_impermeabile_pct', rampa: 'suolo', titolo: 'Suolo impermeabile',
           nota: 'CLMS Imperviousness Density 2018 (10 m): % media di suolo sigillato sul comune, non sulla sola area urbana' },
} as const
export const eMitigazione = (m: ModoMappa): m is keyof typeof MITIGAZIONE => m === 'alberi' || m === 'suolo'

/** Rampa di colore della vista: ogni dominio ha la sua tinta, così non si scambia per un altro. */
export const prefissoRampa = (m: ModoMappa) =>
  (m === 'temperatura' ? 'calore' : m === 'salute' ? 'salute' : eMitigazione(m) ? MITIGAZIONE[m].rampa : 'rampa')

/** Un valore statico dell'anagrafica nella forma di una cella (VALORE, o assente = N/D), per riusare stile e tooltip. */
const cellaStatica = (valore: number | null | undefined) =>
  (valore == null ? undefined : ({ valore, stato: 'VALORE', nota: null } as unknown as CellaMensile))

/** Colore risolto (non `var(...)`: Leaflet scrive attributi SVG) della banda di salubrità. */
const coloreBandaToken = (token: Token, banda: Banda): string =>
  token[`salubrita-${banda === 'non_confrontabile' ? 'nc' : banda}`]

export interface Classi {
  soglie: number[] // limiti inferiori delle 5 classi
  min: number
  max: number
}

/** Cinque classi a intervalli uguali fra il minimo e il massimo dei valori del mese (nessuna soglia di legge:
 * i limiti di legge si riferiscono a statistiche diverse da fonte a fonte). */
export function calcolaClassi(valori: number[]): Classi | null {
  if (!valori.length) return null
  const min = Math.min(...valori)
  const max = Math.max(...valori)
  const passo = (max - min) / 5
  return { min, max, soglie: [0, 1, 2, 3, 4].map((i) => min + i * passo) }
}

function classeDi(classi: Classi | null, v: number): number {
  if (!classi || classi.max === classi.min) return 2
  let c = 0
  for (let i = 0; i < 5; i++) if (v >= classi.soglie[i]) c = i
  return c
}

/** Cella della zona: per un poligono comunale condiviso da più comuni (Presicce-Acquarica) il primo con valore. */
function primaCella(celle: (CellaMensile | undefined)[]): CellaMensile | undefined {
  const presenti = celle.filter(Boolean) as CellaMensile[]
  return presenti.find((c) => c.stato === 'VALORE') ?? presenti[0]
}
function cellaComune(aria: AriaMese | null | undefined, ids: string[], inquinante: string): CellaMensile | undefined {
  return primaCella(ids.map((id) => aria?.comuni[id]?.[inquinante]))
}

/** Zoom più lontano ammesso prima che si conosca quello che contiene tutto il Salento. */
const ZOOM_MINIMO = 7

/** Inquadra il Salento e lo reinquadra quando la carta cambia misura o quando il cuore della zona, appoggiato a
 * sinistra (28/10/2026), si apre o si chiude: `riserva` sono i px coperti dal bordo sinistro, e il Salento si inquadra
 * nel resto. Smette di reinquadrare quando l'utente ha trascinato o zoomato a mano (un clic su una zona non conta). */
function AdattaVista({ confini, riserva }: { confini: Confini; riserva: number }) {
  const mappa = useMap()
  const rif = useRef({ riserva, mossaDallUtente: false, inquadra: null as (() => void) | null })
  rif.current.riserva = riserva
  useEffect(() => {
    const limiti = L.geoJSON(confini.distretti).getBounds()
    const contenitore = mappa.getContainer()
    // il Salento resta sempre inquadrato: non ci si allontana nel mare (maxBounds) né si rimpicciolisce
    // sotto lo zoom che lo contiene tutto (minZoom). Lascia comunque un po' di margine attorno.
    const margine = 16
    const zoomMinimo = () => mappa.setMinZoom(mappa.getBoundsZoom(limiti, false, L.point(rif.current.riserva + 3 * margine, 2 * margine)) - 0.25)
    const inquadra = () => {
      // i limiti vecchi fermerebbero l'inquadratura: si tolgono, si inquadra, si rimettono. Lo zoom minimo va tolto
      // PRIMA (29/10/2026): se superava lo zoom attuale, Leaflet partiva con uno zoom animato fino al minimo e ignorava
      // il fitBounds arrivato durante l'animazione, così il Salento restava piccolo e centrato sotto la scheda.
      // I limiti di trascinamento comprendono anche la parte coperta dalla scheda (altrimenti Leaflet ricentrerebbe)
      mappa.setMaxBounds(L.latLngBounds([]))
      mappa.setMinZoom(ZOOM_MINIMO)
      // senza animazione: se la mappa si smonta a metà (cambio di tab) Leaflet non cerca più un riquadro rimosso
      mappa.fitBounds(limiti, { paddingTopLeft: [rif.current.riserva + margine, margine], paddingBottomRight: [margine, margine], animate: false })
      zoomMinimo()
      mappa.setMaxBounds(limiti.pad(0.25).extend(mappa.containerPointToLatLng([0, mappa.getSize().y / 2])))
    }
    rif.current.inquadra = inquadra
    inquadra()
    const segna = () => { rif.current.mossaDallUtente = true }
    const suPulsanteZoom = (e: PointerEvent) => { if ((e.target as Element | null)?.closest('.leaflet-control-zoom')) segna() }
    mappa.on('dragstart', segna)
    contenitore.addEventListener('wheel', segna, { passive: true })
    contenitore.addEventListener('pointerdown', suPulsanteZoom)
    const osservatore = new ResizeObserver(() => {
      mappa.invalidateSize()
      if (rif.current.mossaDallUtente) zoomMinimo()
      else inquadra()
    })
    osservatore.observe(contenitore)
    return () => {
      osservatore.disconnect()
      mappa.off('dragstart', segna)
      contenitore.removeEventListener('wheel', segna)
      contenitore.removeEventListener('pointerdown', suPulsanteZoom)
      rif.current.inquadra = null
    }
  }, [mappa, confini])
  useEffect(() => {
    if (!rif.current.mossaDallUtente) rif.current.inquadra?.()
  }, [riserva])
  return null
}

/** Una zona scelta dalla ricerca (29/10/2026): `n` cresce a ogni scelta, così la stessa zona scelta due volte conta. */
export type RichiestaVista = { id: string; n: number }

/** Dopo una scelta dalla ricerca la carta scorre solo se la zona non si vede per intero (scelta di Matteo): lo spazio
 *  libero è la parte della carta visibile nella finestra (sotto la testata fissa), a destra della scheda e sotto la
 *  ricerca e lo zoom. Lo zoom non cambia; la zona si porta al centro dello spazio libero. Il controllo si ripete quando
 *  la scheda si apre (cambia `riserva`) o la carta cambia misura (la scheda si allunga coi dati della zona), finché la
 *  zona resta in primo piano e la carta non si muove a mano. */
function PortaInVista({ confini, richiesta, riserva, focus }: { confini: Confini; richiesta: RichiestaVista | null; riserva: number; focus: string | null }) {
  const mappa = useMap()
  const stato = useRef({ id: null as string | null, ultima: null as RichiestaVista | null, riserva, focus })
  stato.current.riserva = riserva
  stato.current.focus = focus
  const controlla = useCallback(() => {
    const { id, riserva: sinistra, focus: inPrimoPiano } = stato.current
    if (!id || inPrimoPiano !== id) { stato.current.id = null; return }
    const forma = eDistretto(id)
      ? confini.distretti.features.find((f) => f.properties.id_distretto === id)
      : confini.comuni.features.find((f) => f.properties.id_comuni.includes(id))
    if (!forma) return
    const limiti = L.geoJSON(forma).getBounds()
    const { x: w, y: h } = mappa.getSize()
    const margine = 16
    // parte della carta dentro la finestra, sotto la testata fissa e sotto la ricerca e lo zoom (in alto a destra)
    const r = mappa.getContainer().getBoundingClientRect()
    const testata = document.querySelector('.filtri-fissi:not([hidden])')?.getBoundingClientRect().bottom ?? 0
    let alto = Math.max(64, testata - r.top + margine)
    let basso = Math.min(h, window.innerHeight - r.top) - margine
    if (basso - alto < 120) { alto = 64; basso = h - margine } // carta quasi fuori dalla finestra: vale la carta intera
    const a = mappa.latLngToContainerPoint(limiti.getNorthWest())
    const b = mappa.latLngToContainerPoint(limiti.getSouthEast())
    if (a.x >= sinistra + margine && b.x <= w - margine && a.y >= alto && b.y <= basso) return
    const c = mappa.latLngToContainerPoint(limiti.getCenter())
    const fermo = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    mappa.panBy([c.x - (sinistra + w) / 2, c.y - (alto + basso) / 2], { animate: !fermo, duration: 0.4 })
  }, [mappa, confini])
  // nuova scelta, o la scheda che si apre o si chiude
  useEffect(() => {
    if (richiesta && richiesta !== stato.current.ultima) {
      stato.current.ultima = richiesta
      stato.current.id = richiesta.id
    }
    controlla()
  }, [richiesta, riserva, controlla])
  useEffect(() => {
    // la carta cambia misura: si ricontrolla dopo il reinquadramento di AdattaVista, che avviene nello stesso evento
    let viva = true // la carta può smontarsi (cambio di tab) prima che scatti il controllo rimandato
    const suMisura = () => { setTimeout(() => { if (viva) controlla() }, 0) }
    const smetti = () => { stato.current.id = null }
    const suZoom = (e: PointerEvent) => { if ((e.target as Element | null)?.closest('.leaflet-control-zoom')) smetti() }
    const contenitore = mappa.getContainer()
    mappa.on('resize', suMisura)
    mappa.on('dragstart', smetti)
    contenitore.addEventListener('wheel', smetti, { passive: true })
    contenitore.addEventListener('pointerdown', suZoom)
    return () => {
      viva = false
      mappa.off('resize', suMisura)
      mappa.off('dragstart', smetti)
      contenitore.removeEventListener('wheel', smetti)
      contenitore.removeEventListener('pointerdown', suZoom)
    }
  }, [mappa, controlla])
  return null
}

/** Riquadro al passaggio del puntatore (28/10/2026, al posto dei tooltip di Leaflet): sta di lato al puntatore e non
 *  sopra la zona, si gira quando arriva al bordo e resta sempre dentro la carta. Larghezza secondo il contenuto, fra
 *  il minimo e il massimo di app.css (.tooltip-zona). */
interface ApiTooltip {
  mostra: (contenuto: HTMLElement, p: L.Point) => void
  sposta: (p: L.Point) => void
  nascondi: () => void
}
/** Distanza dal puntatore e dal bordo della carta, in px. */
const SCARTO_TOOLTIP = 18
const MARGINE_TOOLTIP = 8

function TooltipMappa({ api, riserva }: { api: MutableRefObject<ApiTooltip | null>; riserva: MutableRefObject<number> }) {
  const mappa = useMap()
  useEffect(() => {
    const carta = mappa.getContainer()
    const el = document.createElement('div')
    el.className = 'tooltip-zona'
    el.setAttribute('role', 'tooltip')
    carta.appendChild(el)
    const sposta = (p: L.Point) => {
      const [w, h] = [el.offsetWidth, el.offsetHeight]
      // area in cui il riquadro si vede: la carta, tagliata dalla finestra, dalla testata fissa dei filtri quando la
      // carta è scrollata in parte fuori vista e dal cuore della zona appoggiato a sinistra (coordinate della carta)
      const r = carta.getBoundingClientRect()
      const testata = document.querySelector('.filtri-fissi')?.getBoundingClientRect().bottom ?? 0
      const x0 = Math.max(0, -r.left, riserva.current) + MARGINE_TOOLTIP
      const x1 = Math.min(carta.clientWidth, window.innerWidth - r.left) - MARGINE_TOOLTIP
      const y0 = Math.max(0, testata - r.top) + MARGINE_TOOLTIP
      const y1 = Math.min(carta.clientHeight, window.innerHeight - r.top) - MARGINE_TOOLTIP
      // a destra e sotto il puntatore; a sinistra o sopra se non c'è posto; mai fuori dall'area visibile
      let x = p.x + SCARTO_TOOLTIP
      let y = p.y + SCARTO_TOOLTIP
      if (x + w > x1) x = p.x - SCARTO_TOOLTIP - w
      if (y + h > y1) y = p.y - SCARTO_TOOLTIP - h
      x = Math.max(x0, Math.min(x, x1 - w))
      y = Math.max(y0, Math.min(y, y1 - h))
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
    }
    const nascondi = () => el.classList.remove('visibile')
    api.current = {
      mostra: (contenuto, p) => { el.replaceChildren(contenuto); el.classList.add('visibile'); sposta(p) },
      sposta,
      nascondi,
    }
    mappa.on('movestart zoomstart mouseout', nascondi)
    return () => {
      mappa.off('movestart zoomstart mouseout', nascondi)
      el.remove()
      api.current = null
    }
  }, [mappa, api, riserva])
  return null
}

/** Contenuto del riquadro: nome della zona, parametro con il suo valore, al più una nota breve. */
function contenutoTooltip(titolo: string, parametro: string, valore: string, nota?: string | null, mancante = false) {
  const el = document.createElement('div')
  const t = document.createElement('b')
  t.className = 'tt-titolo'
  t.textContent = titolo
  const riga = document.createElement('div')
  riga.className = 'tt-riga'
  const p = document.createElement('span')
  p.className = 'tt-parametro'
  p.textContent = parametro
  const v = document.createElement('span')
  v.className = mancante ? 'tt-valore tt-mancante' : 'tt-valore'
  v.textContent = valore
  riga.append(p, v)
  el.append(t, riga)
  if (nota) {
    const n = document.createElement('span')
    n.className = 'tt-nota'
    n.textContent = nota
    el.append(n)
  }
  return el
}

/** Vista «Tutte»: dalla nota della cella solo le fonti entrate e scartate (testi_uso del server), abbreviate. */
function fontiAccorpata(cella: CellaMensile | undefined): string | null {
  const m = cella?.nota?.match(/fonti: [^;]*(; scartate per scarto: .*)?/)
  return m ? m[0].replace('scartate per scarto', 'scartate') : null
}

/** Valore di una cella; per un dato mancante la nota dice il motivo al posto della nota della vista. */
function contenutoCella(titolo: string, parametro: string, cella: CellaMensile | undefined, unita: string | null | undefined, nota?: string | null) {
  if (cella?.stato === 'VALORE' && cella.valore != null)
    return contenutoTooltip(titolo, parametro, `${numero(cella.valore)} ${unita ?? ''}`.trim(), nota)
  return contenutoTooltip(titolo, parametro, cella ? ETICHETTA_STATO[cella.stato] : 'N/D', cella?.nota ?? nota, true)
}

function contenutoBanda(titolo: string, z: { banda: Banda; inquinante_peggiore?: string | null } | undefined) {
  if (!z) return contenutoTooltip(titolo, 'Salubrità', 'N/D', 'nessun dato aria', true)
  return contenutoTooltip(titolo, 'Salubrità', ETICHETTA_BANDA[z.banda],
    z.banda === 'non_confrontabile' ? 'nessun limite applicabile' : `peggiore: ${z.inquinante_peggiore ?? '—'}`)
}

/** Id del pattern SVG del tratteggio delle zone senza stazioni fisiche (definito una volta in un <svg> nascosto:
 * in un documento HTML `url(#id)` si risolve anche fra <svg> diversi, quindi vale per i poligoni di Leaflet). */
const ID_TRATTEGGIO = 'tratteggio-senza-stazioni'
const URL_TILE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
/** Opacità del riempimento di una zona con valore: quasi pieno, così le scritte della mappa di base non trapelano sotto
 *  i nomi dei comuni (a 0,88 si leggevano doppi). */
const RIEMPIMENTO = 0.94
/** Anello del mondo per il velo fuori dal Salento: i confini dei distretti ne sono i buchi (regola pari-dispari). */
const MONDO: L.LatLngTuple[] = [[-85, -180], [85, -180], [85, 180], [-85, 180]]
// note del riquadro: brevi, ma il dato modellato resta sempre dichiarato
const NOTA_TEMPERATURA = 'ERA5-Land, modellato'
const NOTA_SENZA_STAZIONI = 'solo CAMS, modellato'
const PARAMETRO = { temperatura: 'T media', alberi: 'Chioma', suolo: 'Suolo', salubrita: 'Salubrità', salute: 'Eventi sanitari' } as const
/** Vista «Salute»: unità breve e nota del riquadro (il valore contiene ricoveri e PS simulati). */
const UNITA_SALUTE = 'per 100.000 al giorno'
const notaSalute = (cella: CellaMensile | undefined, comune: boolean) =>
  cella?.stato === 'VALORE' ? `${comune ? 'valore del distretto (privacy); ' : ''}${cella.nota?.split(';')[0] ?? ''}; dato simulato` : null
const NOTA_MITIGAZIONE = { alberi: 'CLMS 2024', suolo: 'CLMS 2018' } as const

export default function MappaZone({ confini, aria, indice, inquinante, unita, livello, zone, focus, classi, mostraStazioni, mostraNomi, modo, salubrita, calore, salute, fonteModellata, riserva = 0, inVista = null, onDettaglio, onConfronto }: {
  confini: Confini
  aria: AriaMese | null | undefined
  indice: IndiceTerritorio | null
  inquinante: string
  unita: string | null
  livello: Livello
  zone: ZonaScelta[]
  focus: string | null
  classi: Classi | null
  mostraStazioni: boolean
  mostraNomi: boolean
  modo: ModoMappa
  salubrita: SalubritaMappa | null | undefined
  calore: CaloreMappa | null | undefined
  /** Eventi sanitari per la vista «Salute» (decessi + ricoveri + PS; ricoveri e PS simulati). */
  salute?: SaluteMappa | null | undefined
  fonteModellata: boolean
  /** Px della carta coperti a sinistra dal cuore della zona: il Salento si inquadra a destra e il riquadro non ci va sotto. */
  riserva?: number
  /** Zona appena scelta dalla ricerca: la carta scorre se non si vede. */
  inVista?: RichiestaVista | null
  onDettaglio: (id: string) => void
  onConfronto: (id: string) => void
}) {
  const { token } = useTema()
  const riservaRif = useRef(riserva)
  riservaRif.current = riserva

  // riferimenti sempre aggiornati per i gestori creati una volta da Leaflet
  const rif = useRef({ aria, inquinante, onDettaglio, onConfronto, indice, unita, modo, salubrita, calore, salute })
  rif.current = { aria, inquinante, onDettaglio, onConfronto, indice, unita, modo, salubrita, calore, salute }
  const tooltip = useRef<ApiTooltip | null>(null)
  /** Il riquadro segue il puntatore sulla zona; il contenuto si compone all'ingresso. */
  const conTooltip = (layer: Layer, contenuto: () => HTMLElement) => {
    layer.on('mouseover', (e: L.LeafletMouseEvent) => tooltip.current?.mostra(contenuto(), e.containerPoint))
    layer.on('mousemove', (e: L.LeafletMouseEvent) => tooltip.current?.sposta(e.containerPoint))
    layer.on('mouseout', () => tooltip.current?.nascondi())
  }

  // zone senza nessuna stazione fisica di nessuna fonte (flag statico di /api/territorio, 14/10/2026)
  const distrettoSenza = (id: string) => !!indice?.distretti.get(id)?.senza_stazioni
  const comuneSenza = (ids: string[]) => ids.length > 0 && ids.every((id) => !!indice?.comuni.get(id)?.senza_stazioni)

  // temperatura, chioma e suolo hanno rampe proprie, così non si scambiano per un inquinante
  const rampa = [1, 2, 3, 4, 5].map((i) => token[`${prefissoRampa(modo)}-${i}` as 'rampa-1'])
  const scelte = new Set(zone.map((z) => z.id))

  const bordo = (selezionata: boolean, interattiva: boolean): PathOptions => ({
    color: selezionata ? token['mappa-selezione'] : token['mappa-bordo'],
    weight: selezionata ? 3.5 : interattiva ? 1.5 : 0.6,
    opacity: 1,
  })
  const senzaDato = (selezionata: boolean): PathOptions => ({
    ...bordo(selezionata, true), color: selezionata ? token['mappa-selezione'] : token['mappa-nodata'],
    // fondo della scheda, non trasparente: la sagoma del Salento resta intera e la base non trapela
    fillColor: token.card, fillOpacity: 0.92, dashArray: selezionata ? undefined : '1 4',
  })

  // zona senza stazioni fisiche, in una vista di fonte misurata: tratteggio, non il vuoto di un N/D temporaneo
  const senzaStazioni = (selezionata: boolean): PathOptions => ({
    ...bordo(selezionata, true), fillColor: `url(#${ID_TRATTEGGIO})`, fillOpacity: 1,
  })

  // modalità «valore»: scala relativa min-max della finestra per l'inquinante scelto
  const stileCella = (cella: CellaMensile | undefined, selezionata: boolean, interattiva: boolean, senza = false): PathOptions => {
    if (cella?.stato === 'VALORE' && cella.valore != null)
      return { ...bordo(selezionata, interattiva), fillColor: rampa[classeDi(classi, cella.valore)], fillOpacity: RIEMPIMENTO }
    // nella vista di un modello (CAMS) anche queste zone hanno un valore: il tratteggio serve solo alle fonti misurate
    if (senza && !fonteModellata) return senzaStazioni(selezionata)
    if (cella?.stato === 'NULL') return { ...bordo(selezionata, interattiva), fillColor: token['mappa-null'], fillOpacity: 0.5, dashArray: selezionata ? undefined : '4 3' }
    return senzaDato(selezionata)
  }

  // modalità «salubrità»: colore della banda rispetto ai limiti di legge (peggiore inquinante)
  const stileBanda = (banda: Banda | undefined, selezionata: boolean): PathOptions => {
    if (!banda) return senzaDato(selezionata)
    if (banda === 'non_confrontabile')
      return { ...bordo(selezionata, true), fillColor: token['salubrita-nc'], fillOpacity: 0.38, dashArray: selezionata ? undefined : '4 3' }
    return { ...bordo(selezionata, true), fillColor: coloreBandaToken(token, banda), fillOpacity: RIEMPIMENTO }
  }
  const bandaComune = (ids: string[]) => ids.map((id) => salubrita?.comuni[id]?.banda).find(Boolean)

  const stileDistretti = (f?: GeoJSON.Feature) => {
    const p = f!.properties as ProprietaDistretto
    const sel = scelte.has(p.id_distretto) // il bordo d'inchiostro è solo delle zone a confronto (07/11/2026)
    // vista per comune: i confini dei distretti sono filetti bianchi più spessi di quelli dei comuni, come su una carta
    if (livello === 'comuni')
      return { color: sel ? token['mappa-selezione'] : token['mappa-bordo'], weight: sel ? 3 : 2.6, opacity: 1, fill: false, interactive: false }
    if (modo === 'salubrita') return stileBanda(salubrita?.distretti[p.id_distretto]?.banda, sel)
    if (modo === 'temperatura') return stileCella(calore?.distretti[p.id_distretto], sel, true)
    if (modo === 'salute') return stileCella(salute?.distretti[p.id_distretto], sel, true)
    if (eMitigazione(modo)) return stileCella(cellaStatica(indice?.distretti.get(p.id_distretto)?.[MITIGAZIONE[modo].campo]), sel, true)
    return stileCella(aria?.distretti[p.id_distretto]?.[inquinante], sel, true, distrettoSenza(p.id_distretto))
  }
  const stileComuni = (f?: GeoJSON.Feature) => {
    const p = f!.properties as ProprietaComune
    const sel = p.id_comuni.some((id) => scelte.has(id)) // idem
    const s = modo === 'salubrita' ? stileBanda(bandaComune(p.id_comuni), sel)
      : modo === 'temperatura' ? stileCella(primaCella(p.id_comuni.map((id) => calore?.comuni[id])), sel, true)
      : modo === 'salute' ? stileCella(primaCella(p.id_comuni.map((id) => salute?.comuni[id])), sel, true)
      : eMitigazione(modo) ? stileCella(cellaStatica(indice?.comuni.get(p.id_comuni[0])?.[MITIGAZIONE[modo].campo]), sel, true)
      : stileCella(cellaComune(aria, p.id_comuni, inquinante), sel, true, comuneSenza(p.id_comuni))
    // filetto sottile fra comuni, così quello dei distretti si legge sopra
    return sel || s.color !== token['mappa-bordo'] ? s : { ...s, weight: 0.9 }
  }
  // Leaflet aggiorna lo stile quando cambia l'identità della funzione: si ricrea quando cambiano i dati
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stileD = useMemo(() => stileDistretti, [aria, inquinante, livello, zone, focus, classi, token, modo, salubrita, calore, salute, fonteModellata, indice])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stileC = useMemo(() => stileComuni, [aria, inquinante, zone, focus, classi, token, modo, salubrita, calore, salute, fonteModellata, indice])

  const suDistretto = (f: GeoJSON.Feature, layer: Layer) => {
    const p = f.properties as ProprietaDistretto
    conTooltip(layer, () => {
      const r = rif.current
      const nome = nomeZona(r.indice, p.id_distretto)
      if (r.modo === 'salubrita') return contenutoBanda(nome, r.salubrita?.distretti[p.id_distretto])
      if (r.modo === 'temperatura') return contenutoCella(nome, PARAMETRO.temperatura, r.calore?.distretti[p.id_distretto], r.calore?.unita, NOTA_TEMPERATURA)
      if (r.modo === 'salute') {
        const c = r.salute?.distretti[p.id_distretto]
        return contenutoCella(nome, PARAMETRO.salute, c, UNITA_SALUTE, notaSalute(c, false))
      }
      if (eMitigazione(r.modo))
        return contenutoCella(nome, PARAMETRO[r.modo], cellaStatica(r.indice?.distretti.get(p.id_distretto)?.[MITIGAZIONE[r.modo].campo]), '%', NOTA_MITIGAZIONE[r.modo])
      const c = r.aria?.distretti[p.id_distretto]?.[r.inquinante]
      const nota = r.aria?.fonte_modellata ? 'modellato'
        : r.aria?.fonte === FONTE_ACCORPATA ? fontiAccorpata(c)
        : r.indice?.distretti.get(p.id_distretto)?.senza_stazioni ? NOTA_SENZA_STAZIONI
        : c?.quota_residenti != null ? `misura: ${Math.round(c.quota_residenti * 100)}% residenti` : null
      return contenutoCella(nome, r.inquinante, c, r.unita, nota)
    })
    layer.on('click', () => rif.current.onDettaglio(p.id_distretto))
    layer.on('dblclick', () => rif.current.onConfronto(p.id_distretto))
  }
  const suComune = (f: GeoJSON.Feature, layer: Layer) => {
    const p = f.properties as ProprietaComune
    conTooltip(layer, () => {
      const r = rif.current
      if (r.modo === 'salubrita') return contenutoBanda(p.nome, p.id_comuni.map((id) => r.salubrita?.comuni[id]).find(Boolean))
      if (r.modo === 'temperatura')
        return contenutoCella(p.nome, PARAMETRO.temperatura, primaCella(p.id_comuni.map((id) => r.calore?.comuni[id])), r.calore?.unita, NOTA_TEMPERATURA)
      if (r.modo === 'salute') {
        const c = primaCella(p.id_comuni.map((id) => r.salute?.comuni[id]))
        return contenutoCella(p.nome, PARAMETRO.salute, c, UNITA_SALUTE, notaSalute(c, true))
      }
      if (eMitigazione(r.modo))
        return contenutoCella(p.nome, PARAMETRO[r.modo], cellaStatica(r.indice?.comuni.get(p.id_comuni[0])?.[MITIGAZIONE[r.modo].campo]), '%', NOTA_MITIGAZIONE[r.modo])
      const c = cellaComune(r.aria, p.id_comuni, r.inquinante)
      const senza = p.id_comuni.length > 0 && p.id_comuni.every((id) => !!r.indice?.comuni.get(id)?.senza_stazioni)
      const nota = r.aria?.fonte_modellata ? 'modellato'
        : r.aria?.fonte === FONTE_ACCORPATA ? fontiAccorpata(c)
        : senza ? NOTA_SENZA_STAZIONI
        : c?.totale != null ? `${c.con_valore ?? 0}/${c.totale} stazioni` : null
      return contenutoCella(p.nome, r.inquinante, c, r.unita, nota)
    })
    layer.on('click', () => rif.current.onDettaglio(p.id_comuni[0]))
    layer.on('dblclick', () => rif.current.onConfronto(p.id_comuni[0]))
  }

  // etichette delle zone a confronto: il pallino ha il colore della zona, il testo resta nel colore del testo
  const etichette = useMemo(() => {
    return zone.map((z) => {
      let pos: L.LatLngExpression | null = null
      const d = confini.distretti.features.find((f) => f.properties.id_distretto === z.id)
      if (d) pos = d.properties.etichetta
      else {
        const c = confini.comuni.features.find((f) => f.properties.id_comuni.includes(z.id))
        if (c) pos = L.geoJSON(c).getBounds().getCenter()
      }
      if (!pos) return null
      const el = document.createElement('span')
      el.className = 'etichetta-zona'
      const pall = document.createElement('i')
      pall.style.background = token[`zona-${z.slot}`]
      // un distretto col nome del suo comune sede (02/11/2026, scelta di Matteo: «Poggiardo», non «LE-58»); la sigla resta
      // solo se l'anagrafica non ha la sede
      const testo = z.id.match(/^[A-Z]{2}-\d{2}$/) ? (indice?.distretti.get(z.id)?.sede ?? z.id) : (indice?.comuni.get(z.id)?.denominazione ?? z.id)
      el.append(pall, document.createTextNode(testo))
      return { id: z.id, pos, testo, icona: L.divIcon({ className: 'etichetta-zona-ancora', html: el, iconSize: [0, 0] }) }
    }).filter(Boolean) as { id: string; pos: L.LatLngExpression; testo: string; icona: L.DivIcon }[]
  }, [zone, confini, token, indice])

  // velo fuori dal Salento: l'anello del mondo con i confini esterni di ogni distretto come buchi
  const veloFuori = useMemo(() => {
    const buchi: L.LatLngTuple[][] = []
    for (const f of confini.distretti.features) {
      const g = f.geometry
      const poligoni = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
      for (const p of poligoni) buchi.push(p[0].map(([lon, lat]) => [lat, lon] as L.LatLngTuple))
    }
    return [MONDO, ...buchi]
  }, [confini])

  // zone sollevate: le stesse geometrie delle zone a confronto, ridisegnate sopra con un'ombra più netta (app.css).
  // Solo il confronto: la zona in primo piano resta tale anche quando la si toglie dal confronto, ma non va sollevata
  const sollevate = useMemo(() => {
    const ids = new Set(zone.map((z) => z.id))
    const features = livello === 'comuni'
      ? confini.comuni.features.filter((f) => f.properties.id_comuni.some((id) => ids.has(id)))
      : confini.distretti.features.filter((f) => ids.has(f.properties.id_distretto))
    return { chiave: `${livello}:${[...ids].sort().join(',')}`, dati: { type: 'FeatureCollection', features } as GeoJSON.FeatureCollection }
  }, [confini, livello, zone])

  // vista «tutte le fonti»: tutte le stazioni fisiche, «misura» se almeno una fonte ha valori nella finestra
  const accorpata = aria?.fonte === FONTE_ACCORPATA
  const stazioni = !mostraStazioni || !aria || aria.fonte_modellata
    ? []
    : aria.stazioni.filter((s) => s.lat != null && s.lon != null && (accorpata || s.fonti.includes(aria.fonte)))
  const misuraStazione = (s: (typeof stazioni)[number]) => accorpata
    ? Object.values(s.inquinanti_con_valore).some((elenco) => elenco?.includes(inquinante))
    : !!s.inquinanti_con_valore[aria!.fonte]?.includes(inquinante)

  return (
    <>
    <svg width="0" height="0" className="definizioni-svg" aria-hidden="true" focusable="false">
      <defs>
        <pattern id={ID_TRATTEGGIO} patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
          {/* fondo della scheda sotto il tratteggio: la mappa di base (e le sue scritte) non trapela */}
          <rect width="7" height="7" fill={token.card} fillOpacity="0.92" />
          <line x1="0" y1="0" x2="0" y2="7" stroke={token['mappa-nodata']} strokeWidth="2.2" strokeOpacity="0.55" />
        </pattern>
      </defs>
    </svg>
    <MapContainer className="mappa" zoomSnap={0.25} minZoom={ZOOM_MINIMO} maxZoom={13} scrollWheelZoom doubleClickZoom={false} zoomControl={false}
                  maxBoundsViscosity={0.9} center={[40.35, 17.95]} zoom={8.5} attributionControl>
      <TileLayer url={URL_TILE} maxZoom={19}
                 attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      {/* lo zoom a destra: a sinistra la carta è del cuore della zona */}
      <ZoomControl position="topright" />
      {/* sopra i tile (200), sotto i poligoni (400) */}
      <Pane name="fuori" style={{ zIndex: 350, pointerEvents: 'none' }}>
        <Polygon positions={veloFuori} interactive={false}
                 pathOptions={{ stroke: false, fillColor: token['mappa-fuori'], fillOpacity: 0.72 }} />
      </Pane>
      <AdattaVista confini={confini} riserva={riserva} />
      {/* dopo AdattaVista: se la scheda si apre e il Salento si reinquadra, la zona si ricontrolla sulla vista nuova */}
      <PortaInVista confini={confini} richiesta={inVista} riserva={riserva} focus={focus} />
      <TooltipMappa api={tooltip} riserva={riservaRif} />
      {livello === 'comuni' && <GeoJSON key="comuni" data={confini.comuni} style={stileC} onEachFeature={suComune} />}
      <GeoJSON key={`distretti-${livello}`} data={confini.distretti} style={stileD}
               onEachFeature={livello === 'distretti' ? suDistretto : undefined} interactive={livello === 'distretti'} />
      <Pane name="sollevate" style={{ zIndex: 430, pointerEvents: 'none' }}>
        <GeoJSON key={sollevate.chiave} data={sollevate.dati} interactive={false}
                 style={livello === 'comuni' ? stileC : stileD} />
      </Pane>
      {mostraNomi && <NomiComuni confini={confini} indice={indice} focus={focus} escludi={zone.map((z) => z.id).join(',')}
                                 occupati={etichette} />}
      {stazioni.map((s) => {
        const misura = misuraStazione(s)
        return (
          <CircleMarker key={s.id_stazione} center={[s.lat!, s.lon!]} radius={misura ? 4.5 : 3.5}
                        pathOptions={{ color: token.card, weight: 2, fillColor: misura ? token.testo : token.card, fillOpacity: 1 }}
                        eventHandlers={{
                          mouseover: (e) => tooltip.current?.mostra(contenutoTooltip(s.denominazione ?? s.id_stazione, inquinante,
                            misura ? 'misura' : 'N/D', s.fonti.join(', '), !misura), e.containerPoint),
                          mousemove: (e) => tooltip.current?.sposta(e.containerPoint),
                          mouseout: () => tooltip.current?.nascondi(),
                        }} />
        )
      })}
      {etichette.map((e) => <Marker key={e.id} position={e.pos} icon={e.icona} interactive={false} />)}
    </MapContainer>
    </>
  )
}
