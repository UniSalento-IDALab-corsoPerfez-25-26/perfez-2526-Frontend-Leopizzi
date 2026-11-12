// Parole e numeri condivisi della tab «Stagionalità» (29/10/2026): mesi, intervalli d'anni, scarti e nomi brevi degli
// indicatori, usati dal consiglio, dai periodi critici e dalle tabelle. Regola di Matteo: testo schematico, anni come
// intervallo («dal 2024 al 2026»), unità una volta sola, niente diciture lunghe ripetute.

import type { CriticitaAnno, RigaStagionalita } from '../api/client'
import { conSegno, percentuale } from './formato'

export const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
export const MESI_LUNGHI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre']

export const iniziale = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t)

/** "a", "a e b", "a, b e c". */
export const elenco = (voci: string[]) => (voci.length < 2 ? voci.join('') : `${voci.slice(0, -1).join(', ')} e ${voci[voci.length - 1]}`)

/** Anni come intervallo: «2024-2026» se consecutivi, altrimenti «2020, 2022 e 2024». */
export function intervalloAnni(anni: (number | string)[]) {
  const n = [...new Set(anni.map(Number))].sort((a, b) => a - b)
  if (n.length < 2) return n.join('')
  return n.every((a, i) => i === 0 || a === n[i - 1] + 1) ? `${n[0]}-${n[n.length - 1]}` : elenco(n.map(String))
}

/** «dal 2024 al 2026» o «del 2025». */
export function periodoAnni(anni: (number | string)[]) {
  const n = [...new Set(anni.map(Number))].sort((a, b) => a - b)
  if (n.length < 2) return `del ${n.join('')}`
  return n.every((a, i) => i === 0 || a === n[i - 1] + 1) ? `dal ${n[0]} al ${n[n.length - 1]}` : `negli anni ${elenco(n.map(String))}`
}

/** «+12%», «−8%», «0%» (mai «-0%» per una variazione che si arrotonda a zero). */
function variazionePct(p: number) {
  const t = percentuale(Math.abs(p))
  return /^0\D*%$/.test(t) ? t : `${p > 0 ? '+' : '−'}${t}`
}

/** Scarto in °C per la temperatura, in percentuale per il resto. */
export const scarto = (valore: number, assoluto: boolean) => (assoluto ? `${conSegno(valore)} °C` : variazionePct(valore))

/** Nome breve di un indicatore: quello del tema delle criticità se c'è («Pronto soccorso», «Assistiti ADI»). */
export function nomeIndicatore(r: Pick<RigaStagionalita, 'id' | 'etichetta'>, k?: CriticitaAnno | null) {
  if (r.id === 'calore') return 'Temperatura massima'
  return k?.temi.find((t) => t.id === r.id)?.nome ?? r.etichetta
}

/** Dove sta un blocco della tab: il consiglio porta lì (29/10/2026). */
export function vaiA(id: string) {
  const lento = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById(id)?.scrollIntoView({ behavior: lento ? 'smooth' : 'auto', block: 'start' })
}
