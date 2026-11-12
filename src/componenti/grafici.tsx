// Pezzi comuni dei grafici Recharts: serie, tooltip con tutte le serie in quel punto, legenda.

import type { Stato } from '../api/client'
import { numero } from '../lib/formato'
import { ETICHETTA_STATO, Pallino, StatoDato } from './comuni'

export interface Serie {
  chiave: string // chiave della riga: valore in riga[chiave], stato in riga[`${chiave}__stato`], nota in riga[`${chiave}__nota`]
  nome: string
  colore: string
  tratteggio?: boolean
}

export type Riga = Record<string, string | number | null>

function cellaRiga(riga: Riga, chiave: string) {
  return {
    valore: riga[chiave] as number | null,
    stato: (riga[`${chiave}__stato`] ?? 'NO_DATA') as Stato,
    nota: riga[`${chiave}__nota`] as string | null,
  }
}

/** Tooltip: una riga per serie, il valore in evidenza e il nome dopo; gli stati mancanti scritti per esteso. */
export function TooltipSerie({ active, label, righe, chiaveX, serie, unita, etichettaX, formato = numero }: {
  active?: boolean
  label?: string | number
  righe: Riga[]
  chiaveX: string
  serie: Serie[]
  unita?: string | null
  etichettaX: (x: string) => string
  formato?: (v: number) => string
}) {
  if (!active || label == null) return null
  const riga = righe.find((r) => r[chiaveX] === label)
  if (!riga) return null
  return (
    <div className="tooltip-grafico">
      <div className="tooltip-x">{etichettaX(String(label))}</div>
      {serie.map((s) => {
        const c = cellaRiga(riga, s.chiave)
        return (
          <div className="tooltip-riga" key={s.chiave}>
            <i className={`tasto-linea${s.tratteggio ? ' tasto-tratteggio' : ''}`} style={{ ['--c' as string]: s.colore }} />
            {c.stato === 'VALORE' && c.valore != null ? (
              <strong>
                {formato(c.valore)}
                {unita && <small> {unita}</small>}
              </strong>
            ) : (
              <strong className="tooltip-mancante"><StatoDato stato={c.stato} nota={c.nota} dim={16} /></strong>
            )}
            <span>{s.nome}</span>
            {c.stato !== 'VALORE' && c.nota && <em>{c.nota}</em>}
          </div>
        )
      })}
    </div>
  )
}

export function Legenda({ serie, righe }: { serie: Serie[]; righe?: Riga[] }) {
  if (serie.length < 2) return null
  const vuota = (s: Serie) => !!righe?.length && righe.every((r) => r[`${s.chiave}__stato`] !== 'VALORE')
  return (
    <ul className="legenda">
      {serie.map((s) => (
        <li key={s.chiave}>
          <Pallino colore={s.colore} tratteggio={s.tratteggio} />
          {s.nome}
          {vuota(s) && <StatoDato stato="NO_DATA" nota="nessun valore nel periodo" dim={16} />}
        </li>
      ))}
    </ul>
  )
}

/** Vista tabella di un grafico: righe = punti sull'asse X, colonne = serie, con gli stati espliciti. */
export function TabellaSerie({ righe, chiaveX, intestazioneX, serie, unita, etichettaX, formato = numero }: {
  righe: Riga[]
  chiaveX: string
  intestazioneX: string
  serie: Serie[]
  unita?: string | null
  etichettaX: (x: string) => string
  formato?: (v: number) => string
}) {
  return (
    <div className="tabella-scorre">
      <table className="tabella tabella-compatta">
        <thead>
          <tr>
            <th scope="col">{intestazioneX}</th>
            {serie.map((s) => (
              <th scope="col" key={s.chiave} className="num">
                {s.nome}
                {unita && <small> ({unita})</small>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {righe.map((r) => (
            <tr key={String(r[chiaveX])}>
              <th scope="row">{etichettaX(String(r[chiaveX]))}</th>
              {serie.map((s) => {
                const c = cellaRiga(r, s.chiave)
                return (
                  <td key={s.chiave} className="num" title={c.nota ?? undefined}
                      data-csv={c.stato === 'VALORE' && c.valore != null ? String(c.valore) : ETICHETTA_STATO[c.stato]}>
                    {c.stato === 'VALORE' && c.valore != null ? formato(c.valore) : <StatoDato stato={c.stato} nota={c.nota} dim={16} />}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Proprietà comuni degli assi: tacche nel colore del testo attenuato, cifre tabulari, linea di base sottile. */
export const assi = (testo3: string, asse: string) => ({
  tick: { fill: testo3, fontSize: 12, fontFamily: 'inherit' },
  axisLine: { stroke: asse },
  tickLine: false as const,
})
