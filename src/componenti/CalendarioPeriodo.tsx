// Calendario a comparsa della barra temporale: si sceglie inizio e fine della finestra con due clic, oppure con
// una preimpostazione (ultimi giorni, mese corrente, mese precedente, un mese qualsiasi dell'archivio). La finestra
// è al più di un mese (`massima` giorni, decisione del 09/10/2026): oltre, la fine viene accorciata e lo si dice.

import { useEffect, useRef, useState } from 'react'

import type { PeriodoCompleto } from '../api/client'
import { EtichettaEspansa } from './comuni'
import { MenuSelezione } from './Filtri'
import { etichettaGiornoCompleto, etichettaMese, giorniNelMese, giorniTra, primoDelMese, spostaGiorno, spostaMese, ultimoDelMese } from '../lib/formato'

const NOMI_MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const GIORNI_SETTIMANA = ['lu', 'ma', 'me', 'gi', 've', 'sa', 'do']

export default function CalendarioPeriodo({ asseDa, asseA, coperti, inizio, fine, massima, completo, onApplica, onChiudi }: {
  asseDa: string
  asseA: string
  coperti: Set<string>
  inizio: string
  fine: string
  massima: number
  completo: PeriodoCompleto | null
  onApplica: (da: string, a: string) => void
  onChiudi: () => void
}) {
  const [da, setDa] = useState(inizio)
  const [a, setA] = useState<string | null>(fine)
  const [avviso, setAvviso] = useState<string | null>(null)
  // la griglia di sinistra: il mese di inizio, ma la destra non va oltre l'ultimo mese dell'archivio
  const meseSinistro = (g: string) => {
    const ultimo = asseA.slice(0, 7)
    const m = g.slice(0, 7) >= ultimo ? spostaMese(ultimo, -1) : g.slice(0, 7)
    return m < asseDa.slice(0, 7) ? asseDa.slice(0, 7) : m
  }
  const [mese, setMese] = useState(meseSinistro(inizio))
  const [anno, setAnno] = useState(Number(fine.slice(0, 4)))
  const radice = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const tasto = (e: KeyboardEvent) => { if (e.key === 'Escape') onChiudi() }
    const fuori = (e: MouseEvent) => { if (radice.current && !radice.current.contains(e.target as Node)) onChiudi() }
    document.addEventListener('keydown', tasto)
    document.addEventListener('mousedown', fuori)
    return () => { document.removeEventListener('keydown', tasto); document.removeEventListener('mousedown', fuori) }
  }, [onChiudi])

  const limita = (x: string) => (x < asseDa ? asseDa : x > asseA ? asseA : x)
  /** Imposta la finestra entro l'archivio e al più `massima` giorni, dicendo se l'ha accorciata. */
  const imposta = (d0: string, d1: string) => {
    let x = limita(d0 < d1 ? d0 : d1)
    let y = limita(d0 < d1 ? d1 : d0)
    if (giorniTra(x, y) > massima) {
      y = spostaGiorno(x, massima - 1)
      setAvviso(`Al più ${massima} giorni: fine portata al ${etichettaGiornoCompleto(y)}.`)
    } else setAvviso(null)
    if (y > asseA) { y = asseA; x = limita(spostaGiorno(y, -(massima - 1))) }
    setDa(x)
    setA(y)
    setMese(meseSinistro(x))
  }

  const clic = (g: string) => {
    if (a === null) imposta(da, g)
    else { setDa(g); setA(null); setAvviso(null) }
  }

  const ultimoMese = asseA.slice(0, 7)
  const preimpostazioni: [string, () => void][] = [
    ...(completo ? [[`${etichettaMese(completo.da.slice(0, 7))}, con tutti i dati`, () => imposta(completo.da, completo.a)] as [string, () => void]] : []),
    ['Ultimi 7 giorni', () => imposta(spostaGiorno(asseA, -6), asseA)],
    ['Ultimi 14 giorni', () => imposta(spostaGiorno(asseA, -13), asseA)],
    ['Ultimi 30 giorni', () => imposta(spostaGiorno(asseA, -29), asseA)],
    ['Mese corrente', () => imposta(primoDelMese(ultimoMese), asseA)],
    ['Mese precedente', () => imposta(primoDelMese(spostaMese(ultimoMese, -1)), ultimoDelMese(spostaMese(ultimoMese, -1)))],
    ['Stesso mese, anno prima', () => imposta(primoDelMese(spostaMese(ultimoMese, -12)), ultimoDelMese(spostaMese(ultimoMese, -12)))],
  ]
  const anni: number[] = []
  for (let y = Number(asseDa.slice(0, 4)); y <= Number(asseA.slice(0, 4)); y++) anni.push(y)

  const griglia = (m: string) => {
    const primo = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1).getDay()
    const vuoti = (primo + 6) % 7 // settimana da lunedì
    const celle: (string | null)[] = [...Array(vuoti).fill(null)]
    for (let d = 1; d <= giorniNelMese(m); d++) celle.push(`${m}-${String(d).padStart(2, '0')}`)
    return (
      <div className="cal-mese" key={m}>
        <div className="cal-mese-nome">{etichettaMese(m)}</div>
        <div className="cal-griglia" role="grid" aria-label={etichettaMese(m)}>
          {GIORNI_SETTIMANA.map((g) => <span key={g} className="cal-intestazione" aria-hidden="true">{g}</span>)}
          {celle.map((g, i) => {
            if (!g) return <span key={`v${i}`} />
            const fuori = g < asseDa || g > asseA
            const dentro = a !== null && g >= da && g <= a
            const estremo = g === da || g === a
            return (
              <button key={g} type="button" disabled={fuori} onClick={() => clic(g)}
                      className={`cal-giorno${dentro ? ' cal-dentro' : ''}${estremo ? ' cal-estremo' : ''}${!fuori && !coperti.has(g) ? ' cal-scoperto' : ''}`}
                      aria-pressed={estremo} aria-label={etichettaGiornoCompleto(g)}>
                {Number(g.slice(8))}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="calendario" ref={radice} role="dialog" aria-label="Scegli la finestra">
      <div className="cal-preimpostazioni">
        {preimpostazioni.map(([nome, f]) => <button key={nome} type="button" className="cal-preimpostazione" onClick={f}>{nome}</button>)}
        <div className="cal-mesi-anno">
          <MenuSelezione classe="menu-selezione-card" etichetta="Anno" valore={String(anno)} onScegli={(y) => setAnno(Number(y))}
                         voci={anni.map((y) => ({ id: String(y), testo: String(y) }))} />
          <div className="cal-mesi">
            {NOMI_MESI.map((nome, i) => {
              const m = `${anno}-${String(i + 1).padStart(2, '0')}`
              const fuori = m < asseDa.slice(0, 7) || m > ultimoMese
              return <button key={m} type="button" disabled={fuori} onClick={() => imposta(primoDelMese(m), ultimoDelMese(m))}>{nome}</button>
            })}
          </div>
        </div>
      </div>
      <div className="cal-corpo">
        <div className="cal-navigazione">
          <button type="button" className="pillola pillola-piccola con-etichetta" disabled={mese <= asseDa.slice(0, 7)} onClick={() => setMese(spostaMese(mese, -1))} aria-label="Mese precedente"><EtichettaEspansa testo="Mese precedente" verso="destra" />‹</button>
          <button type="button" className="pillola pillola-piccola con-etichetta" disabled={spostaMese(mese, 1) >= ultimoMese} onClick={() => setMese(spostaMese(mese, 1))} aria-label="Mese successivo"><EtichettaEspansa testo="Mese successivo" />›</button>
        </div>
        <div className="cal-mesi-griglie">{griglia(mese)}{griglia(spostaMese(mese, 1))}</div>
        <div className="cal-piede">
          <span>
            {a === null ? 'Scegli il giorno di fine' : <>{etichettaGiornoCompleto(da)} → {etichettaGiornoCompleto(a)} ({giorniTra(da, a)} giorni)</>}
            {avviso && <small className="suggerimento-attenzione"> {avviso}</small>}
          </span>
          <span className="cal-azioni">
            <button type="button" className="link" onClick={onChiudi}>annulla</button>
            <button type="button" className="pillola pillola-attiva" disabled={a === null} onClick={() => { if (a) { onApplica(da, a); onChiudi() } }}>Applica</button>
          </span>
        </div>
      </div>
    </div>
  )
}
