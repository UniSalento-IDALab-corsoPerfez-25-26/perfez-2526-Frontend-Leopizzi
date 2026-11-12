// Confronto zona con zona: serie giornaliera del mese per le zone scelte (al più tre), una sola fonte,
// un solo asse. I giorni senza valore restano buchi nella linea, con lo stato nel tooltip e in tabella.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { FONTE_ACCORPATA } from '../api/client'
import { etichettaGiorno, etichettaMese, giornoDelMese } from '../lib/formato'
import { nomeBreve, useSerieAria, type IndiceTerritorio } from '../stato/dati'
import { useTema } from '../stato/token'
import type { ZonaScelta } from '../stato/zone'
import { BadgeModellato, Card, Errore, GraficoVuoto, Vuoto } from './comuni'
import { IconaAria } from './Icone'
import { assi, Legenda, TabellaSerie, TooltipSerie, type Riga, type Serie } from './grafici'

export default function GraficoAndamento({ mese, inquinante, fonte, zone, indice }: {
  mese: string | null
  inquinante: string
  fonte: string
  zone: ZonaScelta[]
  indice: IndiceTerritorio | null
}) {
  const { token } = useTema()
  const ids = zone.map((z) => z.id)
  const q = useSerieAria(mese, inquinante, fonte, ids)

  const serie: Serie[] = zone.map((z) => ({ chiave: z.id, nome: nomeBreve(indice, z.id), colore: token[`zona-${z.slot}`] }))
  const righe: Riga[] = []
  if (q.data) {
    const perZona = new Map(q.data.serie.map((s) => [s.zona.id, s.punti]))
    const giorni = q.data.serie[0]?.punti.map((p) => p.giorno) ?? []
    giorni.forEach((g, i) => {
      const riga: Riga = { giorno: g }
      for (const id of ids) {
        const p = perZona.get(id)?.[i]
        riga[id] = p?.stato === 'VALORE' ? (p.valore ?? null) : null
        riga[`${id}__stato`] = p?.stato ?? 'NO_DATA'
        riga[`${id}__nota`] = p?.nota ?? null
      }
      righe.push(riga)
    })
  }
  const nessunValore = righe.length > 0 && ids.every((id) => righe.every((r) => r[`${id}__stato`] !== 'VALORE'))
  // assistente (31/10/2026): stesso mese, inquinante, fonte e zone del grafico; senza mese o zone il cuore è spento
  const assistente = {
    card: 'andamento' as const,
    titolo: `${inquinante} giorno per giorno`,
    descrizione: [zone.map((z) => nomeBreve(indice, z.id)).join(', '), mese && etichettaMese(mese),
                  fonte === FONTE_ACCORPATA ? 'fonti concordi' : fonte].filter(Boolean).join(', '),
    contesto: mese && ids.length ? { mese, inquinante, fonte, zone: ids } : null,
  }

  return (
    <Card
      caricamento={q.isFetching}
      id="andamento"
      guida="giorno"
      assistente={assistente}
      icona={<IconaAria />}
      titolo={<>{inquinante} giorno per giorno {q.data?.fonte_modellata && <BadgeModellato />}</>}
      sottotitolo={
        q.data
          ? `${etichettaMese(q.data.mese)}, zone a confronto. ${q.data.fonte === FONTE_ACCORPATA ? 'Fonti concordi' : q.data.fonte}${q.data.statistica ? `, ${q.data.statistica}` : ''}${q.data.unita ? ` in ${q.data.unita}` : ''}.`
          : 'Zone a confronto, valore del giorno'
      }
      tabella={righe.length ? <TabellaSerie righe={righe} chiaveX="giorno" intestazioneX="Giorno" serie={serie}
                                            unita={q.data?.unita} etichettaX={etichettaGiorno} /> : undefined}
    >
      {!zone.length ? (
        <Vuoto titolo="Nessuna zona a confronto">Clicca un distretto o un comune sulla mappa, sulle barre o nella tabella.</Vuoto>
      ) : q.isError ? (
        <Errore errore={q.error} />
      ) : (
        <>
          <Legenda serie={serie} righe={righe} />
          {!q.data ? (
            <GraficoVuoto altezza={280}>Andamento giornaliero in caricamento…</GraficoVuoto>
          ) : nessunValore ? (
            <GraficoVuoto altezza={280}>Nessun valore di {inquinante} da {fonte} nel mese per le zone scelte (N/D): prova un'altra fonte o un altro inquinante.</GraficoVuoto>
          ) : (
            <div className="grafico" style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={righe} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={token.griglia} />
                  <XAxis dataKey="giorno" tickFormatter={giornoDelMese} interval="preserveStartEnd" minTickGap={12} {...assi(token['testo-3'], token.asse)} />
                  <YAxis width={48} {...assi(token['testo-3'], token.asse)} axisLine={false}
                         label={q.data?.unita ? { value: q.data.unita, angle: -90, position: 'insideLeft', fill: token['testo-3'], fontSize: 12, dx: 4 } : undefined} />
                  <Tooltip cursor={{ stroke: token.asse, strokeWidth: 1 }} isAnimationActive={false}
                           content={(p) => <TooltipSerie active={p.active} label={p.label as string} righe={righe} chiaveX="giorno"
                                                         serie={serie} unita={q.data?.unita} etichettaX={etichettaGiorno} />} />
                  {serie.map((s) => (
                    <Line key={s.chiave} type="monotone" dataKey={s.chiave} name={s.nome} stroke={s.colore} strokeWidth={2}
                          dot={false} activeDot={{ r: 4.5, stroke: token.card, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
