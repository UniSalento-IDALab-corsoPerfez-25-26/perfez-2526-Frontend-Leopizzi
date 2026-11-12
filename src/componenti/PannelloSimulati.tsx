// Ricoveri, PS e ADI simulati mese per mese, nel confronto sotto la mappa (25/10/2026). Una linea per zona, comuni
// compresi (il dato è sintetico: la regola di privacy dei decessi non si applica), per 100.000 residenti al giorno.
// «Sovrapponi gli scenari»: linea piena per lo scenario scelto, tratteggiata per l'altro, stesso colore della zona; la
// distanza fra le due è l'effetto di aria e caldo imposto nello scenario «letteratura», più il caso.

import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import type { Scenario, SerieSimulata } from '../api/client'
import { conSegno, etichettaMese, etichettaMeseBreve, numero, percentuale } from '../lib/formato'
import { nomeBreve, useSerieSimulata, type IndiceTerritorio } from '../stato/dati'
import { useTema } from '../stato/token'
import type { ZonaScelta } from '../stato/zone'
import { BadgeSimulato, Errore, GraficoVuoto, StatoDato } from './comuni'
import { InterruttoreAnimato, SegmentiAnimati } from './SegmentiAnimati'
import { assi, Legenda, TabellaSerie, type Riga, type Serie } from './grafici'

const INDICATORI_SIMULATI: [string, string][] = [
  ['ps_accessi', 'PS'], ['ps_respiratori', 'PS respiratori'], ['ricoveri_respiratori', 'Ricoveri respiratori'],
  ['ricoveri_circolatori', 'Ricoveri circolatori'], ['adi_accessi_ps', 'PS degli assistiti ADI'],
]

const altroScenario = (s: Scenario): Scenario => (s === 'letteratura' ? 'nullo' : 'letteratura')

/** Righe del grafico: per zona il valore dello scenario scelto (`id`) e dell'altro (`id__altro`), con gli stati. */
function righeSimulate(dati: SerieSimulata | null | undefined, scenario: Scenario): Riga[] {
  if (!dati) return []
  const mesi = dati.serie[0]?.punti.map((p) => p.mese) ?? []
  return mesi.map((m, i) => {
    const r: Riga = { mese: m }
    for (const s of dati.serie) {
      const p = s.punti[i]
      const scelto = p?.[scenario] ?? null
      const altro = p?.[altroScenario(scenario)] ?? null
      r[s.zona.id] = scelto
      r[`${s.zona.id}__stato`] = scelto != null ? 'VALORE' : 'NO_DATA'
      r[`${s.zona.id}__nota`] = scelto != null ? null : 'mese fuori dal periodo simulato'
      r[`${s.zona.id}__altro`] = altro
      r[`${s.zona.id}__altro__stato`] = altro != null ? 'VALORE' : 'NO_DATA'
      r[`${s.zona.id}__diff`] = p?.differenza_percentuale ?? null
    }
    return r
  })
}

/** Tooltip: per zona il valore dei due scenari e la differenza «letteratura» − «nullo» in percentuale. */
function TooltipScenari({ active, label, righe, zone, scenario, sovrapponi }: {
  active?: boolean
  label?: string
  righe: Riga[]
  zone: Serie[]
  scenario: Scenario
  sovrapponi: boolean
}) {
  if (!active || label == null) return null
  const r = righe.find((x) => x.mese === label)
  if (!r) return null
  const altro = altroScenario(scenario)
  return (
    <div className="tooltip-grafico">
      <div className="tooltip-x">{etichettaMese(label)}</div>
      {zone.map((z) => {
        const v = r[z.chiave] as number | null
        const w = r[`${z.chiave}__altro`] as number | null
        const d = r[`${z.chiave}__diff`] as number | null
        return (
          <div className="tooltip-riga" key={z.chiave}>
            <i className="tasto-linea" style={{ ['--c' as string]: z.colore }} />
            {v != null ? <strong>{numero(v)}<small> {scenario}</small></strong> : <strong className="tooltip-mancante"><StatoDato stato="NO_DATA" nota="nessun valore in questo giorno" dim={16} /></strong>}
            <span>{z.nome}</span>
            {sovrapponi && w != null && (
              <em>{altro}: {numero(w)}; letteratura − nullo: {d != null ? conSegno(d, percentuale) : '—'}</em>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PannelloSimulati({ zone, indice, da, a, scenario, indicatore, setIndicatore }: {
  zone: ZonaScelta[]
  indice: IndiceTerritorio | null
  da: string | null
  a: string | null
  scenario: Scenario
  indicatore: string
  setIndicatore: (i: string) => void
}) {
  const { token } = useTema()
  const [sovrapponi, setSovrapponi] = useState(true)
  const q = useSerieSimulata(da, a, indicatore, zone.map((z) => z.id), true)
  const righe = righeSimulate(q.data, scenario)
  const serie: Serie[] = zone.map((z) => ({ chiave: z.id, nome: nomeBreve(indice, z.id), colore: token[`zona-${z.slot}`] }))
  const conValori = righe.some((r) => serie.some((s) => r[s.chiave] != null))
  const altro = altroScenario(scenario)
  const asseX = { dataKey: 'mese', tickFormatter: etichettaMeseBreve, interval: 'preserveStartEnd' as const, minTickGap: 16, ...assi(token['testo-3'], token.asse) }

  return (
    <div className="pannello">
      <h3 className="pannello-titolo">Ricoveri, PS e ADI <small>per 100.000 residenti al giorno</small> <BadgeSimulato /></h3>
      <div className="controlli-pannello">
        <SegmentiAnimati classe="segmenti-piccoli" etichetta="Indicatore simulato" valore={indicatore} onScegli={setIndicatore}
                         opzioni={INDICATORI_SIMULATI.map(([k, nome]) => ({ id: k, testo: nome }))} />
        <InterruttoreAnimato etichetta="Sovrapponi gli scenari" attivo={sovrapponi} onCambia={() => setSovrapponi(!sovrapponi)}
                             testo="Sovrapponi gli scenari" titolo={`Linea piena = scenario «${scenario}», tratteggiata = «${altro}»`} />
      </div>
      <p className="pannello-sottotitolo">
        Media del mese, distretto = somma dei comuni; anche i comuni a confronto hanno la loro linea.
        {sovrapponi && <> Linea piena = scenario «{scenario}», tratteggiata = «{altro}».</>}
      </p>
      {zone.length > 0 && <Legenda serie={serie} righe={righe} />}
      {!zone.length ? (
        <GraficoVuoto altezza={190}>Aggiungi una zona al confronto (distretto o comune) per vedere la serie simulata.</GraficoVuoto>
      ) : q.isError ? <Errore errore={q.error} /> : q.data === null ? (
        <GraficoVuoto altezza={190}>Dati simulati non ancora generati.</GraficoVuoto>
      ) : !q.data ? (
        <GraficoVuoto altezza={190}>Serie simulata in caricamento…</GraficoVuoto>
      ) : !conValori ? (
        <GraficoVuoto altezza={190}>Il periodo è fuori da quello simulato ({q.data.da} → {q.data.a} richiesto): nessun valore.</GraficoVuoto>
      ) : (
        <div className="grafico" style={{ height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={righe} syncId="domini" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={token.griglia} />
              <XAxis {...asseX} />
              <YAxis width={48} {...assi(token['testo-3'], token.asse)} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip cursor={{ stroke: token.asse }} isAnimationActive={false}
                       content={(p) => <TooltipScenari active={p.active} label={p.label as string} righe={righe} zone={serie}
                                                       scenario={scenario} sovrapponi={sovrapponi} />} />
              {sovrapponi && serie.map((s) => (
                <Line key={`${s.chiave}-altro`} type="monotone" dataKey={`${s.chiave}__altro`} stroke={s.colore} strokeWidth={1.5}
                      strokeDasharray="5 4" strokeOpacity={0.85} dot={false} connectNulls={false} isAnimationActive={false} />
              ))}
              {serie.map((s) => (
                <Line key={s.chiave} type="monotone" dataKey={s.chiave} stroke={s.colore} strokeWidth={2} connectNulls={false}
                      dot={{ r: 3.5, fill: s.colore, stroke: token.card, strokeWidth: 2 }} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

/** Vista tabella della serie simulata (dentro la vista tabella della card del confronto). */
export function TabellaSimulati({ dati, scenario, zone, indice }: { dati: SerieSimulata; scenario: Scenario; zone: ZonaScelta[]; indice: IndiceTerritorio | null }) {
  const righe = righeSimulate(dati, scenario)
  const serie: Serie[] = zone.flatMap((z) => [
    { chiave: z.id, nome: `${nomeBreve(indice, z.id)} (${scenario})`, colore: '' },
    { chiave: `${z.id}__altro`, nome: `${nomeBreve(indice, z.id)} (${altroScenario(scenario)})`, colore: '' },
  ])
  return (
    <>
      <h3 className="pannello-titolo">{dati.etichetta} <small>{dati.unita}</small> <BadgeSimulato /></h3>
      <TabellaSerie righe={righe} chiaveX="mese" intestazioneX="Mese" serie={serie} etichettaX={etichettaMese} />
    </>
  )
}
