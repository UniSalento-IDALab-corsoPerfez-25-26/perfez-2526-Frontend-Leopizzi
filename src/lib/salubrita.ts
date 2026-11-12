// Etichette, ordinamento e colori delle bande dell'indice di salubrità dell'aria (rispetto ai limiti di legge).
// Il motore è lato server (localhost/server/salubrita.py); qui solo la presentazione, condivisa fra pannello e
// (in futuro) modalità mappa.

import type { Banda, EsitoRiferimento, SalubritaInquinante } from '../api/client'

export type { Banda } from '../api/client'

export const ETICHETTA_BANDA: Record<Banda, string> = {
  buona: 'buona',
  accettabile: 'accettabile',
  scadente: 'scadente',
  cattiva: 'cattiva',
  non_confrontabile: 'non confrontabile',
}

// severità crescente; non_confrontabile fuori scala (−1): non concorre al "peggiore"
export const ORDINE_BANDA: Record<Banda, number> = {
  buona: 0, accettabile: 1, scadente: 2, cattiva: 3, non_confrontabile: -1,
}

export type Quadro = EsitoRiferimento['quadro']

export const ETICHETTA_QUADRO: Record<Quadro, string> = {
  dlgs_155_2010: 'D.Lgs. 155/2010',
  oms_2021: 'OMS 2021',
  ue_2024_2881: 'UE 2024/2881',
}

export const QUADRI: Quadro[] = ['dlgs_155_2010', 'oms_2021', 'ue_2024_2881']

/** variabile CSS del colore della banda (per pallini e sfondi). */
export const coloreBanda = (b: Banda): string => `var(--salubrita-${b === 'non_confrontabile' ? 'nc' : b})`

/** banda peggiore fra gli esiti di un inquinante per un quadro normativo; non_confrontabile se non ce ne sono. */
export function bandaQuadro(inq: SalubritaInquinante, quadro: Quadro): Banda {
  const bande = inq.esiti.filter((e) => e.quadro === quadro).map((e) => e.banda)
  const confrontabili = bande.filter((b) => ORDINE_BANDA[b] >= 0)
  if (!confrontabili.length) return 'non_confrontabile'
  return confrontabili.reduce((peg, b) => (ORDINE_BANDA[b] > ORDINE_BANDA[peg] ? b : peg), confrontabili[0])
}

/** riga di tooltip per un esito: statistica, limite ed esito del confronto. */
export function descriviEsito(e: EsitoRiferimento): string {
  const lim = `${e.statistica.replace(/_/g, ' ')}, limite ${e.limite} ${e.unita}`
  if (e.tipo === 'giorni_superamento')
    return `${lim}: ${e.giorni_superamento}/${e.giorni_con_valore} giorni oltre${e.superamenti_ammessi_anno != null ? ` (ammessi ${e.superamenti_ammessi_anno}/anno)` : ''} [${e.fonte}]`
  const perc = e.rapporto != null ? ` (${Math.round(e.rapporto * 100)}% del limite)` : ''
  return `${lim}: media ${e.valore != null ? e.valore.toFixed(1) : '—'}${perc}${e.indicativo ? ', indicativo' : ''} [${e.fonte}]`
}
