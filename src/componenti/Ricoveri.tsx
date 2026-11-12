// Ricoveri (dimissioni ospedaliere ISTAT Health for All, 18/10/2026): dato annuale della provincia di residenza, solo
// informativo, non entra nelle correlazioni né nei temi critici. Dal 02/11/2026 (scelta di Matteo) è l'ultimo blocco di
// Stagionalità invece di un grafico sotto la carta: segue la zona della tab (il Salento = le tre province, un distretto
// = la sua provincia) e gli ultimi anni pubblicati, non la finestra della testata.

import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { FONTE_ACCORPATA } from '../api/client'
import { numeroIntero } from '../lib/formato'
import { useDimissioni, useDisponibilita, type IndiceTerritorio } from '../stato/dati'
import { useTema } from '../stato/token'
import { Card, Errore, GraficoVuoto, Vuoto, type AssistenteCard } from './comuni'
import { IconaSalute } from './Icone'
import { assi, Legenda, TabellaSerie, TooltipSerie, type Riga, type Serie } from './grafici'
import { SegmentiAnimati } from './SegmentiAnimati'

const GRUPPI_RICOVERI: [string, string][] = [['respiratorio', 'Respiratorio'], ['bpco', 'BPCO'], ['circolatorio', 'Circolatorio'],
                                           ['ischemiche', 'Ischemiche'], ['cerebrovascolari', 'Cerebrovascolari']]
const ANNI_RICOVERI = 5

export default function Ricoveri({ zona, indice }: { zona: string; indice: IndiceTerritorio | null }) {
  const { token } = useTema()
  const periodo = useDisponibilita().data?.dimissioni
  const [gruppo, setGruppo] = useState('respiratorio')
  const province = (zona === 'SALENTO' ? indice?.province ?? [] : indice?.province.filter((p) => p.distretti.some((d) => d.id_distretto === zona)) ?? [])
  const annoFine = periodo?.a ?? null
  const annoIni = periodo ? Math.max(periodo.da, periodo.a - (ANNI_RICOVERI - 1)) : null
  const rq = useDimissioni(annoIni, annoFine, province.map((p) => p.id_provincia), [gruppo])

  const colori = [token['zona-1'], token['zona-2'], token['zona-3'], token['zona-4']]
  const serie: Serie[] = province.map((p, i) => ({ chiave: p.id_provincia, nome: p.denominazione, colore: colori[i % colori.length] }))
  const righe: Riga[] = []
  if (annoIni != null && annoFine != null && rq.data) {
    for (let anno = annoIni; anno <= annoFine; anno++) {
      const r: Riga = { anno: String(anno) }
      for (const s of serie) {
        const p = rq.data.serie.find((x) => x.provincia === s.chiave)?.punti.find((x) => x.anno === anno)
        r[s.chiave] = p?.stato === 'VALORE' ? (p.dimissioni ?? null) : null
        r[`${s.chiave}__stato`] = p?.stato ?? 'NO_DATA'
        r[`${s.chiave}__nota`] = p?.nota ?? (p ? null : `${anno}: non ancora pubblicato da ISTAT HFA`)
      }
      righe.push(r)
    }
  }
  const etichettaGruppo = GRUPPI_RICOVERI.find(([k]) => k === gruppo)?.[1] ?? gruppo
  const dove = zona === 'SALENTO' ? 'le tre province del Salento' : `la provincia di ${province[0]?.denominazione ?? '…'}, che contiene il distretto`
  // ONE (03/11/2026): la zona della tab (vuota = Salento) e il gruppo di patologia, come indicatore
  const assistente: AssistenteCard = {
    card: 'ricoveri', titolo: 'Ricoveri (dimissioni ospedaliere)', descrizione: `${etichettaGruppo}, ${dove}`,
    contesto: { zone: zona === 'SALENTO' ? [] : [zona], indicatore: gruppo, fonte: FONTE_ACCORPATA },
  }

  return (
    <Card id="ricoveri" icona={<IconaSalute />} guida="decessi" caricamento={rq.isFetching} assistente={assistente}
          titolo="Ricoveri (dimissioni ospedaliere)"
          sottotitolo={`Dimissioni dell'anno per ${etichettaGruppo.toLowerCase()}, ${dove}; ISTAT Health for All, solo informative`}
          azioni={
            <SegmentiAnimati classe="segmenti-piccoli" etichetta="Gruppo di patologia dei ricoveri" valore={gruppo} onScegli={setGruppo}
                             opzioni={GRUPPI_RICOVERI.map(([k, nome]) => ({ id: k, testo: nome }))} />
          }
          tabella={righe.length > 0 ? (
            <TabellaSerie righe={righe} chiaveX="anno" intestazioneX="Anno" serie={serie} unita="dimissioni" etichettaX={(x) => x} formato={numeroIntero} />
          ) : undefined}>
      {rq.isError ? <Errore errore={rq.error} /> : periodo === null || rq.data === null ? (
        <Vuoto titolo="Dimissioni ISTAT non ancora scaricate" />
      ) : !rq.data ? (
        <GraficoVuoto altezza={220}>Dimissioni in caricamento…</GraficoVuoto>
      ) : (
        <>
          <Legenda serie={serie} righe={righe} />
          <div className="grafico" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={righe} margin={{ top: 8, right: 16, bottom: 0, left: 0 }} barGap={2} barCategoryGap="22%">
                <CartesianGrid vertical={false} stroke={token.griglia} />
                <XAxis dataKey="anno" {...assi(token['testo-3'], token.asse)} />
                <YAxis width={56} {...assi(token['testo-3'], token.asse)} axisLine={false} allowDecimals={false} />
                <Tooltip cursor={{ fill: token['card-2'] }} isAnimationActive={false}
                         content={(p) => <TooltipSerie active={p.active} label={p.label as string} righe={righe} chiaveX="anno"
                                                       serie={serie} unita="dimissioni" etichettaX={(x) => x} formato={numeroIntero} />} />
                {serie.map((s) => (
                  <Bar key={s.chiave} dataKey={s.chiave} fill={s.colore} maxBarSize={22} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="nota-grafico">Dato annuale e provinciale: i distretti della stessa provincia hanno lo stesso valore. Non entra nei temi critici né nelle correlazioni.</p>
        </>
      )}
    </Card>
  )
}
