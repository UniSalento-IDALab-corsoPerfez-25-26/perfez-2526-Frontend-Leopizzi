// Confronto fonte con fonte nella zona in primo piano. Regola del 02/10/2026 (repository Backend, docs/Regole_dei_dati.md): OpenAQ, EEA e
// CAMS calcolano il valore del giorno con la stessa statistica (media delle ore) e formano il gruppo di
// validazione diretta; ARPA pubblica una statistica propria (il massimo per NO2, O3, SO2 e CO) e resta una
// serie a sé. Dove le statistiche differiscono, la concordanza non si esprime in percentuale.

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { FONTE_ACCORPATA, type ConfrontoFonti as Coppia } from '../api/client'
import { conSegno, etichettaGiorno, etichettaMese, giornoDelMese, numero, numeroIntero, percentuale } from '../lib/formato'
import { nomeZona, useFontiAria, type IndiceTerritorio } from '../stato/dati'
import { coloreFonte, useTema } from '../stato/token'
import { BadgeModellato, Card, Errore, GraficoVuoto, StatoDato, Vuoto, type AssistenteCard } from './comuni'
import { IconaAria } from './Icone'
import { assi, Legenda, TabellaSerie, TooltipSerie, type Riga, type Serie } from './grafici'

const SEPARATA = 'ARPA'

/** "OpenAQ, EEA e CAMS": un elenco in italiano, non nomi legati da «·». */
const elencoNaturale = (voci: string[]) => (voci.length < 2 ? voci.join('') : `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`)

/** Un grafico a linee delle fonti, con legenda: per giorno (aria, calore), per mese o per settimana (decessi). */
export function PannelloFonti({ titolo, sottotitolo, righe, serie, unita, chiaveX = 'giorno', tickX = giornoDelMese,
  etichettaX = etichettaGiorno, formato = numero, punti = false, dominioY, primaSotto = false }: {
  titolo?: string
  sottotitolo?: string
  righe: Riga[]
  serie: Serie[]
  unita?: string | null
  chiaveX?: string
  tickX?: (x: string) => string
  etichettaX?: (x: string) => string
  formato?: (v: number) => string
  /** Pallini sui punti: servono quando i punti sono pochi (12 mesi). */
  punti?: boolean
  /** Asse Y non ancorato a zero (temperature): una differenza di 1-2 °C deve restare leggibile. */
  dominioY?: [string | number, string | number]
  /** La prima serie larga e semitrasparente, sotto le altre: dove due fonti coincidono (decessi ISTAT ed Eurostat) le
   *  linee si sovrappongono, e così la prima resta visibile come un alone invece di sparire. */
  primaSotto?: boolean
}) {
  const { token } = useTema()
  return (
    <div className="pannello">
      {titolo && <h3 className="pannello-titolo">{titolo}</h3>}
      {sottotitolo && <p className="pannello-sottotitolo">{sottotitolo}</p>}
      <Legenda serie={serie} righe={righe} />
      <div className="grafico" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={righe} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={token.griglia} />
            <XAxis dataKey={chiaveX} tickFormatter={tickX} interval="preserveStartEnd" minTickGap={12} {...assi(token['testo-3'], token.asse)} />
            <YAxis width={44} domain={dominioY} {...assi(token['testo-3'], token.asse)} axisLine={false} />
            <Tooltip cursor={{ stroke: token.asse, strokeWidth: 1 }} isAnimationActive={false}
                     content={(p) => <TooltipSerie active={p.active} label={p.label as string} righe={righe} chiaveX={chiaveX}
                                                   serie={serie} unita={unita} etichettaX={etichettaX} formato={formato} />} />
            {serie.map((s, i) => (
              <Line key={s.chiave} type="monotone" dataKey={s.chiave} name={s.nome} stroke={s.colore}
                    strokeWidth={primaSotto && i === 0 ? 6 : 2} strokeOpacity={primaSotto && i === 0 ? 0.35 : 1}
                    strokeDasharray={s.tratteggio ? '6 4' : undefined} dot={punti ? { r: 2.5, fill: s.colore, strokeWidth: 0 } : false}
                    activeDot={{ r: 4.5, stroke: token.card, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function lettura(c: Coppia): string {
  if (c.stessa_statistica === false) return 'qualitativa'
  if (c.stessa_statistica == null) return 'statistica non dichiarata'
  return c.livello.startsWith('comune') ? 'qualità del modello' : 'validazione'
}

function Concordanza({ c }: { c: Coppia }) {
  if (c.stessa_statistica === false) return <span className="testo-stato" title={c.nota}>—</span>
  if (c.quota_concordanti == null) return <StatoDato stato="NO_DATA" nota={c.nota ?? 'nessuna cella in comune fra le due fonti'} />
  return <span title={c.nota}>{percentuale(c.quota_concordanti)}</span>
}

export default function ConfrontoFonti({ mese, inquinante, zona, indice }: {
  mese: string | null
  inquinante: string
  zona: string | null
  indice: IndiceTerritorio | null
}) {
  const { token } = useTema()
  const q = useFontiAria(mese, inquinante, zona)
  const d = q.data

  const righe: Riga[] = []
  if (d) {
    const giorni = d.serie[0]?.punti.map((p) => p.giorno) ?? []
    giorni.forEach((g, i) => {
      const riga: Riga = { giorno: g }
      for (const s of d.serie) {
        const p = s.punti[i]
        riga[s.fonte] = p?.stato === 'VALORE' ? (p.valore ?? null) : null
        riga[`${s.fonte}__stato`] = p?.stato ?? 'NO_DATA'
        riga[`${s.fonte}__nota`] = p?.nota ?? null
      }
      righe.push(riga)
    })
  }
  const daSerie = (fonte: string, modellata: boolean): Serie => ({
    chiave: fonte, nome: modellata ? `${fonte} (modello)` : fonte, colore: coloreFonte(token, fonte), tratteggio: modellata,
  })
  const gruppo = (d?.serie ?? []).filter((s) => s.fonte !== SEPARATA)
  const arpa = (d?.serie ?? []).find((s) => s.fonte === SEPARATA)
  const serieGruppo = gruppo.map((s) => daSerie(s.fonte, s.modellata))
  const tutte = [...(arpa ? [daSerie(arpa.fonte, arpa.modellata)] : []), ...serieGruppo]
  const statGruppo = [...new Set(gruppo.map((s) => s.statistica).filter(Boolean))].join(' / ')
  // ONE (03/11/2026): la zona in primo piano, il mese e l'inquinante della card
  const assistente: AssistenteCard = {
    card: 'fonti_aria', titolo: `${inquinante} secondo ogni fonte`,
    descrizione: [zona && nomeZona(indice, zona), mese && etichettaMese(mese)].filter(Boolean).join(', '),
    contesto: zona && mese ? { mese, inquinante, zone: [zona], fonte: FONTE_ACCORPATA } : null,
  }

  return (
    <Card
      caricamento={q.isFetching}
      id="fonti"
      guida="aria-confronto"
      assistente={assistente}
      icona={<IconaAria />}
      titolo={`${inquinante} secondo ogni fonte`}
      sottotitolo={zona ? `${nomeZona(indice, zona)}${mese ? `, ${etichettaMese(mese)}` : ''}${d?.unita ? `, in ${d.unita}` : ''}` : 'Validazione per ridondanza delle fonti dell\'aria'}
      tabella={righe.length ? <TabellaSerie righe={righe} chiaveX="giorno" intestazioneX="Giorno" serie={tutte} unita={d?.unita} etichettaX={etichettaGiorno} /> : undefined}
    >
      {!zona ? (
        <Vuoto titolo="Nessuna zona in primo piano">Clicca una zona sulla mappa per confrontare le fonti che la coprono.</Vuoto>
      ) : q.isError ? (
        <Errore errore={q.error} />
      ) : !d ? (
        <GraficoVuoto altezza={300}>Serie delle fonti in caricamento…</GraficoVuoto>
      ) : (
        <>
          <div className="pannelli">
            <PannelloFonti titolo="Gruppo di validazione diretta"
                      sottotitolo={`${elencoNaturale(gruppo.map((s) => s.fonte))}, con la stessa statistica: ${statGruppo || 'non dichiarata'}`}
                      righe={righe} serie={serieGruppo} unita={d?.unita} />
            {arpa && (
              <PannelloFonti titolo="ARPA Puglia, serie a sé" sottotitolo={`Statistica propria: ${arpa.statistica ?? 'non dichiarata'}`}
                        righe={righe} serie={[daSerie(arpa.fonte, arpa.modellata)]} unita={d?.unita} />
            )}
          </div>
          {gruppo.some((s) => s.modellata) && (
            <p className="nota-grafico"><BadgeModellato /> CAMS (linea tratteggiata) è un modello su griglia di circa 10 km: il confronto con le stazioni misura la qualità del modello.</p>
          )}
          {d && d.confronti.length > 0 && (
            <div className="tabella-scorre">
              <table className="tabella tabella-compatta">
                <caption>Concordanza fra coppie di fonti, sulle sole celle in cui entrambe hanno un valore (soglia: ±{numero(d.soglia_concordanza)} {d.unita})</caption>
                <thead>
                  <tr>
                    <th scope="col">Coppia</th>
                    <th scope="col">Livello</th>
                    <th scope="col" className="num">Celle in comune</th>
                    <th scope="col" className="num">Concordanti</th>
                    <th scope="col" className="num">Diff. media (B − A)</th>
                    <th scope="col">Lettura</th>
                  </tr>
                </thead>
                <tbody>
                  {d.confronti.map((c) => (
                    <tr key={`${c.fonte_a}-${c.fonte_b}`}>
                      <th scope="row">
                        <span className="coppia">{c.fonte_a}<span aria-hidden="true">↔</span>{c.fonte_b}</span>
                      </th>
                      <td className="nowrap">{c.livello}</td>
                      <td className="num">{numeroIntero(c.celle_comuni)}</td>
                      <td className="num"><Concordanza c={c} /></td>
                      <td className="num">{c.celle_comuni ? conSegno(c.differenza_media) : '—'}</td>
                      <td title={c.nota}>{lettura(c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  )
}
