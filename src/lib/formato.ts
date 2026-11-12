// Formati italiani per numeri, mesi e giorni.

// separatore delle migliaia anche sotto 10.000: in it-IT `Intl` scriverebbe «3885» accanto a «11.133»
const intero = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 0, useGrouping: 'always' })
const uno = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const due = new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const perc = new Intl.NumberFormat('it-IT', { style: 'percent', maximumFractionDigits: 0 })

/** Concentrazioni: due decimali sotto 1 (es. CO in mg/m³), uno sotto 100, nessuno oltre. */
export function numero(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return '—'
  const a = Math.abs(v)
  return a < 1 ? due.format(v) : a < 100 ? uno.format(v) : intero.format(v)
}

export const numeroIntero = (v: number | null | undefined) => (v == null ? '—' : intero.format(v))
export const percentuale = (v: number | null | undefined) => (v == null ? '—' : perc.format(v))

export function conSegno(v: number | null | undefined, formato: (x: number) => string = numero): string {
  if (v == null || !Number.isFinite(v)) return '—'
  return (v > 0 ? '+' : v < 0 ? '−' : '±') + formato(Math.abs(v))
}

const nomeMese = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })
const meseBreve = new Intl.DateTimeFormat('it-IT', { month: 'short', year: '2-digit' })
const giornoBreve = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short' })

const daMese = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1, 1)
const daGiorno = (g: string) => new Date(Number(g.slice(0, 4)), Number(g.slice(5, 7)) - 1, Number(g.slice(8, 10)))

export const etichettaMese = (m: string) => nomeMese.format(daMese(m))
export const etichettaMeseBreve = (m: string) => meseBreve.format(daMese(m))
export const etichettaGiorno = (g: string) => giornoBreve.format(daGiorno(g))
export const giornoDelMese = (g: string) => String(Number(g.slice(8, 10)))

const giornoCompleto = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })
export const etichettaGiornoCompleto = (g: string) => giornoCompleto.format(daGiorno(g))
/** Periodo nella forma più corta per la testata: «1–30 giu 2026», «15 giu – 14 lug 2026», «15 dic 2025 – 14 gen 2026».
 *  Scritto a mano: `formatRange` in it-IT dà «01-30 giu 2026», con lo zero davanti. */
export function etichettaPeriodoBreve(da: string, a: string): string {
  if (da.slice(0, 4) !== a.slice(0, 4)) return `${etichettaGiornoCompleto(da)} – ${etichettaGiornoCompleto(a)}`
  if (da.slice(0, 7) !== a.slice(0, 7)) return `${etichettaGiorno(da)} – ${etichettaGiornoCompleto(a)}`
  return `${giornoDelMese(da)}–${etichettaGiornoCompleto(a)}`
}

/** Il giorno 'AAAA-MM-GG' spostato di `delta` giorni (in UTC: nessun salto per l'ora legale). */
export function spostaGiorno(g: string, delta: number): string {
  const d = new Date(Date.UTC(Number(g.slice(0, 4)), Number(g.slice(5, 7)) - 1, Number(g.slice(8, 10)) + delta))
  return d.toISOString().slice(0, 10)
}

/** Giorni da `da` ad `a`, estremi compresi. */
export const giorniTra = (da: string, a: string) =>
  Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${da}T00:00:00Z`)) / 86_400_000) + 1

/** I mesi 'AAAA-MM' toccati dai giorni da `da` ad `a`. */
export function mesiTra(da: string, a: string): string[] {
  const out: string[] = []
  for (let m = da.slice(0, 7); m <= a.slice(0, 7); m = spostaMese(m, 1)) out.push(m)
  return out
}

/** Giorni del mese 'AAAA-MM'. */
export const giorniNelMese = (m: string) => new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate()

/** Primo e ultimo giorno del mese 'AAAA-MM'. */
export const primoDelMese = (m: string) => `${m}-01`
export const ultimoDelMese = (m: string) => `${m}-${String(giorniNelMese(m)).padStart(2, '0')}`

/** Il mese 'AAAA-MM' spostato di `delta` mesi. */
export function spostaMese(m: string, delta: number): string {
  const d = daMese(m)
  d.setMonth(d.getMonth() + delta)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
