// Aria ↔ salute ↔ calore alla grana del confronto fra domini, distretto × mese (repository Backend, docs/Regole_dei_dati.md). Tre grafici
// impilati con lo stesso asse dei mesi e il cursore sincronizzato, mai due scale sullo stesso grafico.
// La temperatura ERA5-Land (media del mese della statistica giornaliera scelta, modellata) è tornata il 03/11/2026,
// fra l'aria e i decessi: era nascosta dal 28/10 perché il grafico non c'era ancora.
// I decessi esistono solo per distretto (privacy, §7): i comuni a confronto qui non compaiono.
// I ricoveri (dimissioni ospedaliere ISTAT HFA, dato annuale della provincia) stavano qui dal 18/10/2026; dal 02/11/2026
// sono l'ultimo blocco di Stagionalità (Ricoveri.tsx).
// Ricoveri, PS e ADI **simulati** (25/10/2026) in un grafico a parte (PannelloSimulati), comuni compresi, con i due
// scenari sovrapponibili: sono l'unico grafico che si vede anche con soli comuni a confronto.

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { FONTE_ACCORPATA, type Scenario, type StatisticaCalore } from '../api/client'
import { etichettaMese, etichettaMeseBreve, numeroIntero, spostaMese } from '../lib/formato'
import { eDistretto, nomeBreve, useConfronto, useSerieSimulata, type IndiceTerritorio } from '../stato/dati'
import { useTema } from '../stato/token'
import type { ZonaScelta } from '../stato/zone'
import { Avvertenza, BadgeModellato, Card, Errore, GraficoVuoto, Vuoto } from './comuni'
import type { Domini } from './Filtri'
import { SegmentiAnimati } from './SegmentiAnimati'
import { assi, Legenda, TabellaSerie, TooltipSerie, type Riga, type Serie } from './grafici'
import PannelloSimulati, { TabellaSimulati } from './PannelloSimulati'

const DURATE = [6, 12, 24] as const
const STATISTICHE_CALORE: { id: StatisticaCalore; testo: string }[] = [
  { id: 'massima', testo: 'Massima' }, { id: 'media', testo: 'Media' }, { id: 'minima', testo: 'Minima' },
]
const BADGE_ERA5 = 'Dato modellato, non misurato: ERA5-Land, rianalisi a circa 9 km'

export default function ConfrontoDomini({ mese, inquinante, fonte, fonteModellata, zone, indice, durata, setDurata, domini, scenario }: {
  domini: Domini
  scenario: Scenario
  mese: string | null
  inquinante: string
  fonte: string
  fonteModellata: boolean
  zone: ZonaScelta[]
  indice: IndiceTerritorio | null
  durata: number
  setDurata: (n: number) => void
}) {
  const { token } = useTema()
  const distretti = zone.filter((z) => eDistretto(z.id))
  const comuniEsclusi = zone.filter((z) => !eDistretto(z.id))
  const da = mese ? spostaMese(mese, -(durata - 1)) : null
  // T max di partenza, come la Stagionalità e la relazione col caldo di «giorno per giorno»
  const [statisticaCalore, setStatisticaCalore] = useState<StatisticaCalore>('massima')
  const q = useConfronto(da, mese, inquinante, fonte, distretti.map((z) => z.id), statisticaCalore)
  const d = q.data
  const [indicatoreSim, setIndicatoreSim] = useState('ps_accessi')
  const sq = useSerieSimulata(da, mese, indicatoreSim, zone.map((z) => z.id), domini.simulati)
  const pannelloSimulati = domini.simulati && (
    <PannelloSimulati zone={zone} indice={indice} da={da} a={mese} scenario={scenario} indicatore={indicatoreSim} setIndicatore={setIndicatoreSim} />
  )

  const serie: Serie[] = distretti.map((z) => ({ chiave: z.id, nome: nomeBreve(indice, z.id), colore: token[`zona-${z.slot}`] }))
  const righeAria: Riga[] = []
  const righeDecessi: Riga[] = []
  const righeCalore: Riga[] = []
  if (d) {
    const mesi = d.serie[0]?.aria.map((p) => p.mese) ?? []
    mesi.forEach((m, i) => {
      const ra: Riga = { mese: m }
      const rd: Riga = { mese: m }
      const rc: Riga = { mese: m }
      for (const s of d.serie) {
        const a = s.aria[i]
        ra[s.zona.id] = a?.stato === 'VALORE' ? (a.valore ?? null) : null
        ra[`${s.zona.id}__stato`] = a?.stato ?? 'NO_DATA'
        ra[`${s.zona.id}__nota`] = a?.nota ?? null
        const m2 = s.decessi[i]
        rd[s.zona.id] = m2?.stato === 'VALORE' ? (m2.valore ?? null) : null
        rd[`${s.zona.id}__stato`] = m2?.stato ?? 'NO_DATA'
        rd[`${s.zona.id}__nota`] = m2?.nota ?? null
        const c = s.calore[i]
        rc[s.zona.id] = c?.stato === 'VALORE' ? (c.valore ?? null) : null
        rc[`${s.zona.id}__stato`] = c?.stato ?? 'NO_DATA'
        rc[`${s.zona.id}__nota`] = c?.nota ?? d.calore.motivo ?? 'temperatura ERA5-Land non in cache per il mese'
      }
      righeAria.push(ra)
      righeDecessi.push(rd)
      righeCalore.push(rc)
    })
  }
  const mesiConAria = righeAria.filter((r) => serie.some((s) => r[`${s.chiave}__stato`] === 'VALORE')).map((r) => String(r.mese))
  const conDecessi = righeDecessi.some((r) => serie.some((s) => r[`${s.chiave}__stato`] === 'VALORE'))
  const conCalore = righeCalore.some((r) => serie.some((s) => r[`${s.chiave}__stato`] === 'VALORE'))
  const nomeCalore = `Temperatura ${statisticaCalore}`
  const unitaCalore = d?.calore.unita ?? '°C'
  const ATTESA = 'Serie mensile in caricamento: il primo calcolo di un periodo lungo può richiedere qualche secondo.'
  // assistente (01/11/2026): descrizione e numeri della card (aria, temperatura e decessi dei distretti nel periodo
  // da → mese); il contesto fa ripartire la chat se cambiano periodo, inquinante, fonte, statistica della temperatura o
  // distretti
  const assistente = {
    card: 'domini' as const,
    titolo: 'Aria e salute per distretto e mese',
    descrizione: [distretti.map((z) => nomeBreve(indice, z.id)).join(', '), da && mese && `${etichettaMese(da)} → ${etichettaMese(mese)}`,
                  fonte === FONTE_ACCORPATA ? 'fonti concordi' : fonte].filter(Boolean).join(', '),
    contesto: mese && da ? { da, mese, inquinante, fonte, zone: distretti.map((z) => z.id), statistica_calore: statisticaCalore } : null,
  }
  const asseX = { dataKey: 'mese', tickFormatter: etichettaMeseBreve, interval: 'preserveStartEnd' as const, minTickGap: 16, ...assi(token['testo-3'], token.asse) }

  return (
    <Card
      caricamento={q.isFetching}
      id="domini"
      guida="domini-mese"
      assistente={assistente}
      titolo="Aria e salute per distretto e mese"
      sottotitolo={da && mese ? `${etichettaMese(da)} → ${etichettaMese(mese)}, aria da ${fonte === FONTE_ACCORPATA ? 'tutte le fonti' : fonte}` : undefined}
      azioni={
        <SegmentiAnimati classe="segmenti-piccoli" etichetta="Durata del periodo" valore={String(durata)} onScegli={(n) => setDurata(Number(n))}
                         opzioni={DURATE.map((n) => ({ id: String(n), testo: `${n} mesi` }))} />
      }
      tabella={d ? (
        <>
          <h3 className="pannello-titolo">{inquinante}</h3>
          <TabellaSerie righe={righeAria} chiaveX="mese" intestazioneX="Mese" serie={serie} unita={d.unita} etichettaX={etichettaMese} />
          <h3 className="pannello-titolo">{nomeCalore} (ERA5-Land)</h3>
          <TabellaSerie righe={righeCalore} chiaveX="mese" intestazioneX="Mese" serie={serie} unita={unitaCalore} etichettaX={etichettaMese} />
          <h3 className="pannello-titolo">Decessi (tutte le cause)</h3>
          <TabellaSerie righe={righeDecessi} chiaveX="mese" intestazioneX="Mese" serie={serie} etichettaX={etichettaMese} formato={numeroIntero} />
          {domini.simulati && sq.data && <TabellaSimulati dati={sq.data} scenario={scenario} zone={zone} indice={indice} />}
        </>
      ) : undefined}
    >
      {d && <Avvertenza testo={d.avvertenza} />}
      {!distretti.length ? (
        <>
          <Vuoto titolo="Serve almeno un distretto a confronto">
            I decessi si mostrano solo per distretto e mese (regola di privacy): aggiungi un distretto dalla mappa.
          </Vuoto>
          {pannelloSimulati && zone.length > 0 && <div className="impilati">{pannelloSimulati}</div>}
        </>
      ) : q.isError ? (
        <Errore errore={q.error} />
      ) : (
        <>
          <Legenda serie={serie} righe={righeDecessi} />
          {comuniEsclusi.length > 0 && (
            <p className="nota-grafico">
              {comuniEsclusi.map((z) => nomeBreve(indice, z.id)).join(', ')}: comuni, esclusi da questo confronto perché i decessi sono pubblicati solo per distretto
              {domini.simulati ? ' (compaiono solo nel grafico dei dati simulati).' : '.'}
            </p>
          )}
          <div className="impilati">
            <div className="pannello">
              <h3 className="pannello-titolo">{inquinante} {d?.unita && <small>{d.unita}</small>} {fonteModellata && <BadgeModellato />}</h3>
              <p className="pannello-sottotitolo">
                Media del mese, pesata sui residenti dei comuni con valore.{' '}
                {mesiConAria.length > 0 && mesiConAria.length < righeAria.length &&
                  `Dataset aria disponibile per ${mesiConAria.length} ${mesiConAria.length === 1 ? 'mese' : 'mesi'} su ${righeAria.length}: gli altri sono N/D.`}
              </p>
              {!d ? <GraficoVuoto altezza={170}>{ATTESA}</GraficoVuoto> : !mesiConAria.length ? (
                <GraficoVuoto altezza={170}>Nessun dataset aria generato nel periodo: tutti i mesi sono N/D.</GraficoVuoto>
              ) : (
                <div className="grafico" style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={righeAria} syncId="domini" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={token.griglia} />
                      <XAxis {...asseX} />
                      <YAxis width={48} {...assi(token['testo-3'], token.asse)} axisLine={false} />
                      <Tooltip cursor={{ stroke: token.asse }} isAnimationActive={false}
                               content={(p) => <TooltipSerie active={p.active} label={p.label as string} righe={righeAria} chiaveX="mese"
                                                             serie={serie} unita={d?.unita} etichettaX={etichettaMese} />} />
                      {serie.map((s) => (
                        <Line key={s.chiave} type="monotone" dataKey={s.chiave} stroke={s.colore} strokeWidth={2} connectNulls={false}
                              dot={{ r: 4, fill: s.colore, stroke: token.card, strokeWidth: 2 }} isAnimationActive={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="pannello">
              <h3 className="pannello-titolo">{nomeCalore} <small>{unitaCalore}</small> <BadgeModellato titolo={BADGE_ERA5} /></h3>
              <div className="controlli-pannello">
                <SegmentiAnimati classe="segmenti-piccoli" etichetta="Statistica giornaliera della temperatura" valore={statisticaCalore}
                                 onScegli={setStatisticaCalore} opzioni={STATISTICHE_CALORE} />
              </div>
              <p className="pannello-sottotitolo">
                Media del mese della temperatura {statisticaCalore} giornaliera, ERA5-Land, pesata sui residenti dei comuni del distretto.
              </p>
              {!d ? <GraficoVuoto altezza={170}>{ATTESA}</GraficoVuoto> : !conCalore ? (
                <GraficoVuoto altezza={170}>ERA5-Land non è in archivio per questi mesi: tutti N/D.</GraficoVuoto>
              ) : (
                <div className="grafico" style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={righeCalore} syncId="domini" margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={token.griglia} />
                      <XAxis {...asseX} />
                      <YAxis width={48} {...assi(token['testo-3'], token.asse)} axisLine={false} domain={['auto', 'auto']} />
                      <Tooltip cursor={{ stroke: token.asse }} isAnimationActive={false}
                               content={(p) => <TooltipSerie active={p.active} label={p.label as string} righe={righeCalore} chiaveX="mese"
                                                             serie={serie} unita={unitaCalore} etichettaX={etichettaMese} />} />
                      {serie.map((s) => (
                        <Line key={s.chiave} type="monotone" dataKey={s.chiave} stroke={s.colore} strokeWidth={2} connectNulls={false}
                              dot={{ r: 4, fill: s.colore, stroke: token.card, strokeWidth: 2 }} isAnimationActive={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="pannello">
              <h3 className="pannello-titolo">Decessi per tutte le cause</h3>
              <p className="pannello-sottotitolo">Somma dei comuni del distretto, ISTAT (dati provvisori). Nessuna causa di morte a questa grana.</p>
              {!d ? <GraficoVuoto altezza={170}>{ATTESA}</GraficoVuoto> : !conDecessi ? (
                <GraficoVuoto altezza={170}>ISTAT non ha ancora pubblicato i decessi di questi mesi: tutti N/D.</GraficoVuoto>
              ) : (
                <div className="grafico" style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={righeDecessi} syncId="domini" margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                      <CartesianGrid vertical={false} stroke={token.griglia} />
                      <XAxis {...asseX} />
                      <YAxis width={48} {...assi(token['testo-3'], token.asse)} axisLine={false} allowDecimals={false} />
                      <Tooltip cursor={false} isAnimationActive={false}
                               content={(p) => <TooltipSerie active={p.active} label={p.label as string} righe={righeDecessi} chiaveX="mese"
                                                             serie={serie} etichettaX={etichettaMese} formato={numeroIntero} />} />
                      {serie.map((s) => (
                        <Bar key={s.chiave} dataKey={s.chiave} fill={s.colore} maxBarSize={18} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {pannelloSimulati}

          </div>
        </>
      )}
    </Card>
  )
}
