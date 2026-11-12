// Nomi dei comuni sulla mappa (28/10/2026, scelta di Matteo: tornano i nostri, al posto delle scritte di OpenStreetMap,
// che nominavano frazioni e località ma non sempre il comune). Ogni nome sta nel punto più interno del comune (polo
// d'inaccessibilità: il baricentro di un comune costiero o a mezzaluna può cadere in mare o nel comune accanto) e compare
// solo se a quello zoom il comune è largo abbastanza da contenerlo e il nome non tocca un nome già messo. Si mettono
// prima i comuni più popolosi, così avvicinandosi i nomi si infittiscono. Il comune in primo piano ha sempre il nome, in
// grassetto; le zone a confronto hanno già la loro etichetta e qui si saltano.

import L from 'leaflet'
import { useEffect, useMemo, useState } from 'react'
import { Marker, Pane, useMap } from 'react-leaflet'

import type { Confini } from '../api/client'
import type { IndiceTerritorio } from '../stato/dati'

type Punto = [number, number]

/** Residenti oltre i quali il comune si scrive come città (i tre capoluoghi di provincia). */
const SOGLIA_CITTA = 60_000
/** Quota della larghezza del nome che il comune deve avere a schermo perché il nome ci stia. */
const QUOTA_LARGHEZZA = 0.8
/** Spazio libero attorno a ogni nome, in px. */
const MARGINE = 4

interface Candidato {
  chiave: string
  ids: string[]
  nome: string
  pos: L.LatLng
  sw: L.LatLng
  ne: L.LatLng
  residenti: number
  citta: boolean
}

/** Distanza al quadrato fra il punto p e il segmento ab. */
function distanzaSegmento2(p: Punto, a: Punto, b: Punto): number {
  let [x, y] = a
  let dx = b[0] - x
  let dy = b[1] - y
  if (dx !== 0 || dy !== 0) {
    const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)
    if (t > 1) { x = b[0]; y = b[1] } else if (t > 0) { x += dx * t; y += dy * t }
  }
  dx = p[0] - x
  dy = p[1] - y
  return dx * dx + dy * dy
}

/** Distanza con segno dal bordo del poligono (positiva dentro), regola pari-dispari sugli anelli. */
function distanzaBordo(p: Punto, anelli: Punto[][]): number {
  let dentro = false
  let min = Infinity
  for (const anello of anelli)
    for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
      const a = anello[i]
      const b = anello[j]
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) dentro = !dentro
      min = Math.min(min, distanzaSegmento2(p, a, b))
    }
  return (dentro ? 1 : -1) * Math.sqrt(min)
}

/** Polo d'inaccessibilità (algoritmo «polylabel»): il punto dentro il poligono più lontano dal bordo. */
function poloInaccessibilita(anelli: Punto[][], precisione: number): Punto {
  const esterno = anelli[0]
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const [x, y] of esterno) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const lato = Math.min(x1 - x0, y1 - y0)
  if (lato === 0) return [x0, y0]
  type Cella = { x: number; y: number; h: number; d: number; max: number }
  const cella = (x: number, y: number, h: number): Cella => {
    const d = distanzaBordo([x, y], anelli)
    return { x, y, h, d, max: d + h * Math.SQRT2 }
  }
  const coda: Cella[] = []
  for (let x = x0; x < x1; x += lato) for (let y = y0; y < y1; y += lato) coda.push(cella(x + lato / 2, y + lato / 2, lato / 2))
  let migliore = cella((x0 + x1) / 2, (y0 + y1) / 2, 0)
  while (coda.length) {
    coda.sort((a, b) => a.max - b.max)
    const c = coda.pop()!
    if (c.d > migliore.d) migliore = c
    if (c.max - migliore.d <= precisione) continue
    const h = c.h / 2
    coda.push(cella(c.x - h, c.y - h, h), cella(c.x + h, c.y - h, h), cella(c.x - h, c.y + h, h), cella(c.x + h, c.y + h, h))
  }
  return [migliore.x, migliore.y]
}

/** Area (in gradi², basta per confrontare) dell'anello esterno. */
function area(anello: Punto[]): number {
  let s = 0
  for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) s += (anello[j][0] - anello[i][0]) * (anello[j][1] + anello[i][1])
  return Math.abs(s / 2)
}

/** Punto del nome e riquadro del comune. Le longitudini si scalano per il coseno della latitudine, così le distanze
 *  del polo d'inaccessibilità sono quasi metriche. */
function geometriaNome(g: GeoJSON.Geometry): { pos: L.LatLng; sw: L.LatLng; ne: L.LatLng } | null {
  const poligoni = g.type === 'Polygon' ? [g.coordinates] : g.type === 'MultiPolygon' ? g.coordinates : []
  if (!poligoni.length) return null
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const p of poligoni) for (const [x, y] of p[0]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
  const k = Math.cos((((y0 + y1) / 2) * Math.PI) / 180)
  const principale = poligoni.reduce((a, b) => (area(b[0] as Punto[]) > area(a[0] as Punto[]) ? b : a))
  const anelli = principale.map((anello) => anello.map(([x, y]) => [x * k, y] as Punto))
  const [px, py] = poloInaccessibilita(anelli, 0.0005)
  return { pos: L.latLng(py, px / k), sw: L.latLng(y0, x0), ne: L.latLng(y1, x1) }
}

const tela = document.createElement('canvas').getContext('2d')
/** Larghezza del nome a schermo, misurata con lo stesso font del CSS (.nome-comune). */
function larghezzaTesto(testo: string, citta: boolean, evidenza: boolean): number {
  if (!tela) return testo.length * 6.5
  tela.font = `${citta || evidenza ? 700 : 600} ${citta ? 13 : 11}px "Manrope Variable", system-ui, sans-serif`
  return tela.measureText(testo).width
}

function icona(c: Candidato, evidenza: boolean): L.DivIcon {
  const el = document.createElement('span')
  el.className = `nome-comune${c.citta ? ' nome-citta' : ''}${evidenza ? ' nome-evidenza' : ''}`
  el.textContent = c.nome
  return L.divIcon({ className: 'nome-comune-ancora', html: el, iconSize: [0, 0] })
}

export default function NomiComuni({ confini, indice, focus, escludi, occupati }: {
  confini: Confini
  indice: IndiceTerritorio | null
  focus: string | null
  /** id delle zone a confronto, uniti da «,»: hanno già un'etichetta propria */
  escludi: string
  /** etichette delle zone a confronto (pillole centrate sul punto): i nomi non ci vanno sotto */
  occupati: { pos: L.LatLngExpression; testo: string }[]
}) {
  const mappa = useMap()

  const candidati = useMemo<Candidato[]>(() => confini.comuni.features.flatMap((f) => {
    const geo = geometriaNome(f.geometry)
    if (!geo) return []
    const ids = f.properties.id_comuni
    const residenti = ids.reduce((s, id) => s + (indice?.comuni.get(id)?.residenti ?? 0), 0)
    return [{ chiave: ids.join('+'), ids, nome: f.properties.nome, residenti, citta: residenti >= SOGLIA_CITTA, ...geo }]
  }), [confini, indice])

  const icone = useMemo(() => new Map(candidati.map((c) => [c.chiave, { normale: icona(c, false), evidenza: icona(c, true) }])), [candidati])

  const [visibili, setVisibili] = useState<{ chiave: string; evidenza: boolean }[]>([])

  useEffect(() => {
    const esclusi = new Set(escludi ? escludi.split(',') : [])
    const calcola = () => {
      const z = mappa.getZoom()
      // le pillole delle zone a confronto: testo di 14 px in grassetto, pallino e imbottitura (app.css .etichetta-zona)
      const messi: number[][] = occupati.map((o) => {
        const p = mappa.project(o.pos, z)
        const w = larghezzaTesto(o.testo, true, true) + 40
        return [p.x - w / 2, p.y - 15, p.x + w / 2, p.y + 15]
      })
      const scelti: { chiave: string; evidenza: boolean }[] = []
      const inEvidenza = (c: Candidato) => focus != null && c.ids.includes(focus)
      const ordinati = [...candidati].sort((a, b) => Number(inEvidenza(b)) - Number(inEvidenza(a)) || b.residenti - a.residenti)
      for (const c of ordinati) {
        if (c.ids.some((id) => esclusi.has(id))) continue
        const evidenza = inEvidenza(c)
        const p = mappa.project(c.pos, z)
        const w = larghezzaTesto(c.nome, c.citta, evidenza) + 2 * MARGINE
        const h = (c.citta ? 17 : 15) + 2 * MARGINE
        const riquadro = [p.x - w / 2, p.y - h / 2, p.x + w / 2, p.y + h / 2]
        if (!evidenza) {
          const a = mappa.project(c.sw, z)
          const b = mappa.project(c.ne, z)
          if (Math.abs(b.x - a.x) < (w - 2 * MARGINE) * QUOTA_LARGHEZZA || Math.abs(a.y - b.y) < h - 2 * MARGINE) continue
          if (messi.some((m) => riquadro[0] < m[2] && riquadro[2] > m[0] && riquadro[1] < m[3] && riquadro[3] > m[1])) continue
        }
        messi.push(riquadro)
        scelti.push({ chiave: c.chiave, evidenza })
      }
      setVisibili(scelti)
    }
    calcola()
    // le larghezze dipendono dal font: si ricalcolano quando Manrope è caricato
    let attivo = true
    document.fonts?.ready.then(() => { if (attivo) calcola() })
    mappa.on('zoomend resize', calcola)
    return () => {
      attivo = false
      mappa.off('zoomend resize', calcola)
    }
  }, [mappa, candidati, focus, escludi, occupati])

  const perChiave = useMemo(() => new Map(candidati.map((c) => [c.chiave, c])), [candidati])

  // sopra i poligoni (400) e la zona sollevata (430), sotto le stazioni e le etichette delle zone a confronto (600)
  return (
    <Pane name="nomi" style={{ zIndex: 450, pointerEvents: 'none' }}>
      {visibili.map(({ chiave, evidenza }) => {
        const c = perChiave.get(chiave)!
        const i = icone.get(chiave)!
        return <Marker key={`${chiave}-${evidenza}`} position={c.pos} icon={evidenza ? i.evidenza : i.normale} interactive={false} keyboard={false} />
      })}
    </Pane>
  )
}
