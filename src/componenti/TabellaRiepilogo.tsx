// Riepilogo per distretto della finestra della barra temporale (14/10/2026): una grande tabella con **tutti** i dati
// per distretto — territorio, aria (fonte scelta), salubrità, salute (decessi, ricoveri, simulati), calore — più la variazione
// dell'inquinante scelto sulla finestra precedente. Le colonne arrivano dal server (/api/riepilogo), raggruppate per
// dominio: un dato nuovo è una colonna in più, senza toccare questo componente. Ogni assenza è scritta (N/D, null).
// Le colonne `simulata` (ricoveri, PS e ADI simulati, 25/10/2026) hanno la campitura leggera e la beuta nel gruppo, e
// nel CSV l'intestazione dice «SIMULATO, NON REALE»; si nascondono con la voce «PS e ADI» dei dati della finestra.
// Dal 29/10/2026 la fonte dell'aria si sceglie in testa alla tabella e le spiegazioni stanno in Informazioni. Fase 6
// (29/10): colonna dei distretti ferma e bordo destro sfumato quando la tabella scorre, nome del distretto come pulsante
// (confronto da tastiera), cubo sulle celle che vengono solo da un modello (`modellata` della cella).

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

import { type AriaMese, type CellaRiepilogo, type ColonnaRiepilogo, type Riepilogo } from '../api/client'
import { conSegno, numero, numeroIntero, percentuale } from '../lib/formato'
import { ETICHETTA_BANDA, type Banda } from '../lib/salubrita'
import { nomeZona, type IndiceTerritorio } from '../stato/dati'
import { coloreZona, type ZonaScelta } from '../stato/zone'
import { BadgeModellato, BadgeSimulato, Card, Errore, Pallino, PallinoBanda, ScaricaCsv, StatoDato, Valore, type AssistenteCard } from './comuni'
import { iconaDominio } from './Icone'

type Ordine = { colonna: string; verso: 1 | -1 }

const COLONNA_DELTA = 'delta'
const ORDINE_BANDE: Banda[] = ['buona', 'accettabile', 'scadente', 'cattiva', 'non_confrontabile']

function csv(righe: (string | number | null)[][]) {
  return righe.map((r) => r.map((v) => (v == null ? '' : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(';')).join('\n')
}

/** Valore ordinabile di una cella: numero, posizione della banda o testo; null se assente (resta in fondo). */
function chiaveCella(col: ColonnaRiepilogo, c?: CellaRiepilogo): number | string | null {
  if (!c || c.stato !== 'VALORE') return null
  if (col.formato === 'banda') return c.testo ? ORDINE_BANDE.indexOf(c.testo as Banda) : null
  if (col.formato === 'testo') return c.testo ?? null
  return c.valore ?? null
}

function Cella({ col, c }: { col: ColonnaRiepilogo; c?: CellaRiepilogo }) {
  if (!c || c.stato !== 'VALORE') return <Valore valore={null} stato={c?.stato ?? 'NO_DATA'} nota={c?.nota} />
  // cella che viene solo da un modello (es. la salubrità di un distretto senza stazioni, fase 6): porta il cubo
  const cubo = c.modellata ? <BadgeModellato dim={14} titolo={c.nota ?? undefined} /> : null
  if (col.formato === 'banda' && c.testo) {
    const b = c.testo as Banda
    return <span className="cella-segni">{cubo}<PallinoBanda banda={b} titolo={`${ETICHETTA_BANDA[b] ?? b}${col.nota ? `. ${col.nota}` : ''}${c.nota ? `. ${c.nota}` : ''}`} /></span>
  }
  if (col.formato === 'testo') return <span className="cella-segni" title={c.nota ?? undefined}>{cubo}{c.testo ?? '—'}</span>
  if (col.formato === 'percentuale') return <span title={c.nota ?? undefined}>{percentuale(c.valore)}</span>
  return <Valore valore={c.valore} stato={c.stato} nota={c.nota} formato={col.formato === 'intero' ? numeroIntero : numero} />
}

/** Da che lato la tabella ha ancora colonne nascoste: a sinistra la colonna fissa prende il filetto, a destra il bordo
 *  sfuma (fase 6, 29/10/2026: prima la tabella era tagliata a destra senza dirlo). */
function useScorrimento(montata: boolean) {
  const rif = useRef<HTMLDivElement>(null)
  const [lati, setLati] = useState({ sinistra: false, destra: false })
  useLayoutEffect(() => {
    const el = rif.current
    if (!el) return
    const aggiorna = () => {
      const sinistra = el.scrollLeft > 1
      const destra = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
      setLati((l) => (l.sinistra === sinistra && l.destra === destra ? l : { sinistra, destra }))
    }
    aggiorna()
    el.addEventListener('scroll', aggiorna, { passive: true })
    const osservatore = new ResizeObserver(aggiorna)
    osservatore.observe(el)
    if (el.firstElementChild) osservatore.observe(el.firstElementChild)
    return () => { el.removeEventListener('scroll', aggiorna); osservatore.disconnect() }
  }, [montata])
  return { rif, lati }
}

export default function TabellaRiepilogo({ riepilogo, caricamento, errore, ariaPrima, inquinante, periodo, periodoPrima, indice, zone, onAlterna, mostraSimulati, filtroFonte, assistente }: {
  riepilogo: Riepilogo | null | undefined
  caricamento: boolean
  errore: unknown
  ariaPrima: AriaMese | null | undefined
  inquinante: string
  periodo: string
  periodoPrima: string
  indice: IndiceTerritorio | null
  zone: ZonaScelta[]
  onAlterna: (id: string) => void
  mostraSimulati: boolean
  /** Scelta della fonte dell'aria, la stessa della carta. */
  filtroFonte: ReactNode
  /** ONE sulla tabella (03/11/2026): il contesto lo costruisce App, che conosce finestra, fonte e zone. */
  assistente?: AssistenteCard
}) {
  const [ordine, setOrdine] = useState<Ordine>({ colonna: 'zona', verso: 1 })
  const scorre = useScorrimento(!!riepilogo)
  const colonne = (riepilogo?.colonne ?? []).filter((c) => mostraSimulati || !c.simulata)
  const slot = new Map(zone.map((z) => [z.id, z.slot]))
  const idAria = `aria:${inquinante}`
  const colAria = colonne.find((c) => c.id === idAria)

  const righe = (riepilogo?.righe ?? []).map((r) => {
    const ora = r.celle[idAria]?.stato === 'VALORE' ? (r.celle[idAria].valore ?? null) : null
    const p = ariaPrima?.distretti[r.id_distretto]?.[inquinante]
    const prima = p?.stato === 'VALORE' ? (p.valore ?? null) : null
    return { ...r, nome: nomeZona(indice, r.id_distretto), delta: ora != null && prima != null ? ora - prima : null }
  })

  const chiave = (r: (typeof righe)[number]): number | string | null => {
    if (ordine.colonna === 'zona') return r.id_distretto
    if (ordine.colonna === COLONNA_DELTA) return r.delta
    const col = colonne.find((c) => c.id === ordine.colonna)
    return col ? chiaveCella(col, r.celle[col.id]) : null
  }
  const ordinate = [...righe].sort((a, b) => {
    const x = chiave(a), y = chiave(b)
    if (x == null && y == null) return a.id_distretto.localeCompare(b.id_distretto)
    if (x == null) return 1 // le assenze restano in fondo in entrambi i versi
    if (y == null) return -1
    return (typeof x === 'string' ? x.localeCompare(String(y)) : x - (y as number)) * ordine.verso
  })

  const intestazione = (colonna: string, children: ReactNode, num = true, titolo?: string | null, attiva = false, simulata = false) => (
    <th key={colonna} scope="col" className={`${num ? 'num' : ''}${attiva ? ' colonna-attiva' : ''}${simulata ? ' colonna-simulata' : ''}`} title={titolo ?? undefined}
        aria-sort={ordine.colonna === colonna ? (ordine.verso === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" className="ordina"
              onClick={() => setOrdine((o) => ({ colonna, verso: o.colonna === colonna ? (-o.verso as 1 | -1) : colonna === 'zona' ? 1 : -1 }))}>
        {children}
        <span aria-hidden="true">{ordine.colonna === colonna ? (ordine.verso === 1 ? '↑' : '↓') : ''}</span>
      </button>
    </th>
  )

  // gruppi contigui per la prima riga d'intestazione (Territorio, Aria da <fonte>, Salubrità, Salute, Calore, ...)
  const gruppi: { nome: string; n: number; simulata: boolean }[] = []
  for (const c of colonne) {
    const ultimo = gruppi[gruppi.length - 1]
    if (ultimo?.nome === c.gruppo) ultimo.n++
    else gruppi.push({ nome: c.gruppo, n: 1, simulata: !!c.simulata })
  }

  const esporta = () => {
    const testa = ['id_distretto', 'distretto', ...colonne.map((c) => `${c.simulata ? 'SIMULATO, NON REALE - ' : ''}${c.gruppo}: ${c.etichetta}${c.unita ? ` (${c.unita})` : ''}`),
      `variazione ${inquinante} su ${periodoPrima}`]
    const corpo = ordinate.map((r) => [
      r.id_distretto, r.nome,
      ...colonne.map((c) => {
        const x = r.celle[c.id]
        if (!x || x.stato !== 'VALORE') return x?.stato ?? 'NO_DATA'
        return c.formato === 'banda' || c.formato === 'testo' ? (x.testo ?? null) : (x.valore ?? null)
      }),
      r.delta,
    ])
    const blob = new Blob([`﻿${csv([testa, ...corpo])}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `onehealth_riepilogo_${periodo.replace(/[^0-9A-Za-z]+/g, '_')}_${riepilogo?.fonte ?? ''}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <Card
      id="riepilogo"
      className="card-con-fonte"
      titolo="Riepilogo per distretto"
      sottotitolo={<>{periodo}. Δ = {inquinante} rispetto alla finestra precedente.</>}
      azioni={<>{filtroFonte}<ScaricaCsv onClick={esporta} disabled={!riepilogo} /></>}
      guida="riepilogo"
      assistente={assistente}
      caricamento={caricamento}
    >
      {errore ? <Errore errore={errore} /> : null}
      {!riepilogo && !errore ? <p className="testo-stato">Riepilogo in caricamento…</p> : riepilogo && (
        <div className={`tabella-cornice${scorre.lati.sinistra ? ' scorre-sinistra' : ''}${scorre.lati.destra ? ' scorre-destra' : ''}`}>
        <div className="tabella-scorre" ref={scorre.rif}>
          <table className="tabella tabella-riepilogo">
            <thead>
              <tr className="riga-gruppi">
                <th scope="colgroup" aria-hidden="true" />
                {gruppi.map((g, i) => {
                  const Icona = iconaDominio(g.nome)
                  return (
                    <th key={`${g.nome}-${i}`} scope="colgroup" colSpan={g.n} className={`gruppo${g.simulata ? ' colonna-simulata' : ''}`}>
                      <span className="gruppo-nome">{Icona && <Icona dim={15} />}{g.nome}{g.simulata && <BadgeSimulato dim={16} />}</span>
                    </th>
                  )
                })}
                <th scope="colgroup" className="gruppo">Variazione</th>
              </tr>
              <tr>
                {intestazione('zona', 'Distretto', false)}
                {colonne.map((c) => intestazione(c.id, <>{c.etichetta}{c.modellata && <> <BadgeModellato dim={14} /></>} {c.unita && <small>{c.unita}</small>}</>,
                                                 true, c.nota, c.id === idAria, !!c.simulata))}
                {intestazione(COLONNA_DELTA, <span title={`Variazione di ${inquinante} rispetto a ${periodoPrima}`}>Δ {inquinante}</span>)}
              </tr>
            </thead>
            <tbody>
              {ordinate.map((r) => {
                const s = slot.get(r.id_distretto)
                return (
                  <tr key={r.id_distretto} className={s ? 'riga-scelta' : ''} onClick={() => onAlterna(r.id_distretto)}>
                    <th scope="row">
                      {/* il nome è il pulsante della riga, così il confronto si usa anche da tastiera; il clic sul resto
                          della riga fa lo stesso */}
                      <button type="button" className="cella-zona riga-azione" aria-pressed={!!s}
                              title={s ? 'Togli dal confronto' : 'Aggiungi al confronto'}
                              onClick={(e) => { e.stopPropagation(); onAlterna(r.id_distretto) }}>
                        {s ? <Pallino colore={coloreZona(s)} /> : <i className="pallino-vuoto" aria-hidden="true" />}
                        <span>{r.nome}</span>
                      </button>
                    </th>
                    {colonne.map((c) => (
                      <td key={c.id} className={`num${c.id === idAria ? ' colonna-attiva' : ''}${c.simulata ? ' colonna-simulata' : ''}`}><Cella col={c} c={r.celle[c.id]} /></td>
                    ))}
                    <td className="num">
                      {r.delta != null ? `${conSegno(r.delta)} ${colAria?.unita ?? ''}` : (
                        <StatoDato stato="NO_DATA" nota={ariaPrima ? 'valore mancante in una delle due finestre' : `nessun dataset aria per ${periodoPrima}`} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}
    </Card>
  )
}
