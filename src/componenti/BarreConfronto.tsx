// Classifica delle zone per il valore della finestra, sotto la mappa a tutta larghezza: le zone a confronto nel loro colore, le altre in grigio
// (enfasi). Le zone senza valore non spariscono: dal 29/10/2026 (fase 4) le N/D sono una riga sola in fondo, con i nomi
// e il motivo, invece di una barra vuota ciascuna (con ARPA erano 10 righe su 20); le null restano righe.
// Dal 02/11/2026 (scelta di Matteo) la scheda mostra di default solo le zone a confronto del livello, ciascuna col suo
// posto in classifica; il pulsante in fondo apre l'elenco completo per sceglierne altre. La scala delle barre è sempre
// quella di tutte le zone, così una barra non cambia lunghezza aprendo l'elenco.
// Dal 02/11/2026 (scelta di Matteo) non è più una scheda a sé: sta nella sezione Aria della «Sintesi della finestra»
// (Kpi.tsx), sotto i numeri dell'aria, e la scheda le dà titolo, fonte e guida.

import { useState } from 'react'

import { FONTE_ACCORPATA, type AriaMese, type CellaMensile } from '../api/client'
import { numero } from '../lib/formato'
import { eDistretto, nomeBreve, type IndiceTerritorio } from '../stato/dati'
import { coloreZona, type ZonaScelta } from '../stato/zone'
import { StatoDato } from './comuni'
import { IconaApri } from './Icone'
import type { Livello } from './MappaZone'

export default function BarreConfronto({ aria, inquinante, livello, zone, indice, onAlterna }: {
  aria: AriaMese | null | undefined
  inquinante: string
  livello: Livello
  zone: ZonaScelta[]
  indice: IndiceTerritorio | null
  onAlterna: (id: string) => void
}) {
  const [tutte, setTutte] = useState(false)
  const sorgente = livello === 'distretti' ? aria?.distretti : aria?.comuni
  const voci = Object.entries(sorgente ?? {}).map(([id, celle]) => ({ id, cella: celle[inquinante] as CellaMensile | undefined }))
  const conValore = voci.filter((v) => v.cella?.stato === 'VALORE' && v.cella.valore != null)
    .sort((a, b) => (b.cella!.valore ?? 0) - (a.cella!.valore ?? 0))
  const nulle = voci.filter((v) => v.cella?.stato === 'NULL')
  const senza = voci.filter((v) => !v.cella || v.cella.stato === 'NO_DATA')
  const massimo = conValore[0]?.cella?.valore ?? 0
  const slot = new Map(zone.map((z) => [z.id, z.slot]))
  const elenco = [...conValore, ...nulle]
  const posto = new Map(conValore.map((v, i) => [v.id, i + 1]))
  // zone a confronto del livello, nell'ordine della classifica; anche quelle senza valore, col loro segno
  const perId = new Map(voci.map((v) => [v.id, v]))
  const scelte = zone.filter((z) => eDistretto(z.id) === (livello === 'distretti'))
    .map((z) => perId.get(z.id) ?? { id: z.id, cella: undefined })
    .sort((a, b) => (posto.get(a.id) ?? Infinity) - (posto.get(b.id) ?? Infinity))
  const visibili = tutte ? elenco : scelte
  const nomeLivello = livello === 'distretti' ? 'distretti' : 'comuni'
  const daFonte = aria?.fonte === FONTE_ACCORPATA ? 'da tutte le fonti' : aria?.fonte ? `da ${aria.fonte}` : ''
  // il motivo, se è lo stesso per tutte (es. «nessuna stazione fisica nel distretto»)
  const motivi = [...new Set(senza.map((v) => v.cella?.nota).filter(Boolean))]

  const riga = ({ id, cella }: { id: string; cella?: CellaMensile }) => {
    const s = slot.get(id)
    const v = cella?.stato === 'VALORE' ? cella.valore : null
    const p = posto.get(id)
    return (
      <li key={id}>
        <button type="button" className={`barra${s ? ' barra-scelta' : ''}`} onClick={() => onAlterna(id)} aria-pressed={!!s}
                title={cella?.nota ?? undefined}>
          <span className="barra-posto" title={p ? `${p}° su ${conValore.length} con un valore` : 'senza valore: fuori classifica'}>
            {p ?? '–'}<span className="sr-only">°</span>
          </span>
          <span className="barra-nome">{nomeBreve(indice, id)}</span>
          <span className="barra-traccia">
            {v != null && <span className="barra-pieno" style={{ width: `${massimo ? (v / massimo) * 100 : 0}%`, background: s ? coloreZona(s) : undefined }} />}
          </span>
          <span className="barra-valore">{v != null ? numero(v) : <StatoDato stato={cella?.stato === 'NULL' ? 'NULL' : 'NO_DATA'} nota={cella?.nota} dim={16} />}</span>
        </button>
      </li>
    )
  }

  return (
    <div className="classifica-zone">
      <h4 className="sintesi-sottotitolo">
        {livello === 'distretti' ? 'Distretti' : 'Comuni'} in ordine di {inquinante}
        <small>{tutte ? `tutti i ${voci.length}` : `${scelte.length} a confronto su ${voci.length}`}</small>
      </h4>
      {/* due colonne lette dall'alto in basso: la classifica resta in ordine anche a tutta larghezza */}
      {visibili.length > 0 && (
        <ol className="elenco-barre" style={{ ['--righe' as string]: Math.ceil(visibili.length / 2) }}>
          {visibili.map(riga)}
        </ol>
      )}
      {!tutte && !scelte.length && (
        <p className="barre-vuoto">Nessun {livello === 'distretti' ? 'distretto' : 'comune'} a confronto: aggiungilo dalla sua scheda sulla carta o dall'elenco completo.</p>
      )}
      {tutte && senza.length > 0 && (
        <p className="barre-senza">
          <StatoDato stato="NO_DATA" nota={motivi.length === 1 ? motivi[0] : undefined} dim={16} />
          <span>
            <strong>{senza.length} {livello === 'distretti' ? (senza.length === 1 ? 'distretto' : 'distretti') : (senza.length === 1 ? 'comune' : 'comuni')} senza valore di {inquinante} {daFonte}</strong>
            {motivi.length === 1 && <>, {motivi[0]}</>}
            {livello === 'distretti' && <>: {senza.map((v) => nomeBreve(indice, v.id)).join(', ')}</>}
          </span>
        </p>
      )}
      {voci.length > 0 && (
        <button type="button" className="apri-elenco" aria-expanded={tutte} onClick={() => setTutte((t) => !t)}>
          <IconaApri />
          {tutte ? 'Solo quelli a confronto' : `Tutti i ${voci.length} ${nomeLivello}`}
        </button>
      )}
    </div>
  )
}
