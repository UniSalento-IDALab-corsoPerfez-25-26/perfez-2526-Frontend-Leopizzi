// Query sull'API locale (react-query). `keepPreviousData`: mentre arriva il nuovo periodo o la nuova fonte,
// i grafici tengono il disegno precedente attenuato, senza scheletri né salti di layout.

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { api, type AriaMese, type Comune, type Distretto, type Provincia, type Scenario, type StatisticaCalore } from '../api/client'

const STABILE = { staleTime: Infinity }

const useTerritorio =() => useQuery({ queryKey: ['territorio'], queryFn: api.territorio, ...STABILE })
export const useConfini = () => useQuery({ queryKey: ['confini'], queryFn: api.confini, ...STABILE })
/** Lo stato del server: non si ritenta (se non risponde, l'avviso deve comparire subito) e si rilegge a ogni apertura. */
export const useStatoServer = () => useQuery({ queryKey: ['stato-server'], queryFn: api.stato, retry: false, staleTime: 0 })
export const useDisponibilita = () => useQuery({ queryKey: ['disponibilita'], queryFn: api.disponibilita })

export const useCalendarioAria = () => useQuery({ queryKey: ['aria-calendario'], queryFn: api.ariaCalendario })

/** Finestra di giorni per la mappa, nella stessa forma del mese (`AriaMese`) così mappa e classifica non cambiano. */
export const useAriaFinestra = (da: string | null, a: string | null, fonte: string) =>
  useQuery({
    queryKey: ['aria-finestra', da, a, fonte],
    queryFn: async (): Promise<(AriaMese & { da: string; a: string }) | null> => {
      const f = await api.ariaFinestra(da!, a!, fonte)
      return f && { ...f, mese: f.a.slice(0, 7), giorni_del_mese: f.giorni }
    },
    enabled: !!da && !!a,
    placeholderData: keepPreviousData,
  })

/** Banda di salubrità di tutte le zone della finestra, per la modalità «salubrità» della mappa.
 * `enabled` solo quando la modalità è attiva: non si scarica se non serve. */
export const useSalubritaMappa = (da: string | null, a: string | null, attiva: boolean) =>
  useQuery({
    queryKey: ['aria-salubrita', da, a],
    queryFn: () => api.ariaSalubrita(da!, a!),
    enabled: !!da && !!a && attiva,
    placeholderData: keepPreviousData,
  })

/** Temperatura ERA5-Land di tutte le zone nella finestra, per la modalità «temperatura» della mappa (solo se attiva). */
export const useCaloreMappa = (da: string | null, a: string | null, attiva: boolean) =>
  useQuery({
    queryKey: ['calore-mappa', da, a],
    queryFn: () => api.caloreMappa(da!, a!),
    enabled: !!da && !!a && attiva,
    placeholderData: keepPreviousData,
  })

/** Eventi sanitari di tutte le zone nella finestra (decessi + ricoveri + PS per 100.000 al giorno; ricoveri e PS
 *  simulati), per la vista «Salute» della mappa e la particella Salute del cuore della zona (29/10/2026). */
export const useSaluteMappa = (da: string | null, a: string | null, scenario: Scenario, attiva: boolean) =>
  useQuery({
    queryKey: ['salute-mappa', da, a, scenario],
    queryFn: () => api.saluteMappa(da!, a!, scenario),
    enabled: !!da && !!a && attiva,
    placeholderData: keepPreviousData,
  })

/** Decessi di tutti i distretti dal mese `da` al mese `a` (grana distretto × mese). */
export const useDecessiPeriodo = (da: string | null, a: string | null) =>
  useQuery({
    queryKey: ['decessi-periodo', da, a],
    queryFn: () => api.decessi(da!, a!),
    enabled: !!da && !!a,
    placeholderData: keepPreviousData,
  })

/** Dimissioni ospedaliere (ISTAT HFA) per provincia e gruppo, anni `da`..`a`: dato annuale, solo informativo. */
export const useDimissioni = (da: number | null, a: number | null, province: string[], gruppi: string[]) =>
  useQuery({
    queryKey: ['dimissioni', da, a, province.join(','), gruppi.join(',')],
    queryFn: () => api.dimissioni(da!, a!, province, gruppi),
    enabled: da != null && a != null && province.length > 0 && gruppi.length > 0,
    placeholderData: keepPreviousData,
  })

/** Tabella del tab Riepilogo: tutti i dati per distretto nella finestra (colonne generiche dal server). */
export const useRiepilogo = (da: string | null, a: string | null, fonte: string, scenario: Scenario, attivo: boolean) =>
  useQuery({
    queryKey: ['riepilogo', da, a, fonte, scenario],
    queryFn: () => api.riepilogo(da!, a!, fonte, scenario),
    enabled: !!da && !!a && attivo,
    placeholderData: keepPreviousData,
  })

/** I 12 mesi dell'anno a confronto (tab Stagionalità): non dipende dalla barra temporale, solo da zona e fonte. */
export const useStagionalita = (zona: string, fonte: string, scenario: Scenario, simulatiNellaSintesi: boolean, attivo: boolean) =>
  useQuery({
    queryKey: ['stagionalita', zona, fonte, scenario, simulatiNellaSintesi],
    queryFn: () => api.stagionalita(zona, fonte, scenario, simulatiNellaSintesi),
    enabled: attivo,
    placeholderData: keepPreviousData,
  })

/** Tutti i domini di una zona nella finestra della mappa: alimenta il pannello di dettaglio. */
export const useDettaglioZona = (zona: string | null, da: string | null, a: string | null, scenario: Scenario) =>
  useQuery({
    queryKey: ['zona-dettaglio', zona, da, a, scenario],
    queryFn: () => api.zonaDettaglio(zona!, da!, a!, scenario),
    enabled: !!zona && !!da && !!a,
    placeholderData: keepPreviousData,
  })

/** Ricoveri, PS e ADI simulati di una zona (default il Salento) nella finestra: la tessera dei numeri di testa. */
export const useSimulatiFinestra = (zona: string, da: string | null, a: string | null, scenario: Scenario, attivo: boolean) =>
  useQuery({
    queryKey: ['simulati-finestra', zona, da, a, scenario],
    queryFn: () => api.simulatiFinestra(zona, da!, a!, scenario),
    enabled: !!da && !!a && attivo,
    placeholderData: keepPreviousData,
  })

/** Un indicatore simulato mese per mese, i due scenari insieme (grafico del confronto con la sovrapposizione). */
export const useSerieSimulata = (da: string | null, a: string | null, indicatore: string, zone: string[], attivo: boolean) =>
  useQuery({
    queryKey: ['simulati-serie', da, a, indicatore, zone],
    queryFn: () => api.simulatiSerie(da!, a!, indicatore, zone),
    enabled: !!da && !!a && zone.length > 0 && attivo,
    placeholderData: keepPreviousData,
  })

export const useSerieAria = (mese: string | null, inquinante: string, fonte: string, zone: string[]) =>
  useQuery({
    queryKey: ['aria-serie', mese, inquinante, fonte, zone],
    queryFn: () => api.ariaSerie(mese!, inquinante, fonte, zone),
    enabled: !!mese && zone.length > 0,
    placeholderData: keepPreviousData,
  })

export const useFontiAria = (mese: string | null, inquinante: string, zona: string | null) =>
  useQuery({
    queryKey: ['aria-fonti', mese, inquinante, zona],
    queryFn: () => api.ariaFonti(mese!, inquinante, zona!),
    enabled: !!mese && !!zona,
    placeholderData: keepPreviousData,
  })

export const useFontiCalore = (mese: string | null, zona: string | null, statistica: string) =>
  useQuery({
    queryKey: ['calore-fonti', mese, zona, statistica],
    queryFn: () => api.caloreFonti(mese!, zona!, statistica),
    enabled: !!mese && !!zona,
    placeholderData: keepPreviousData,
  })

/** Decessi secondo ogni fonte nell'anno della finestra: null se lo script di validazione non ha ancora scritto le tabelle. */
export const useFontiSalute = (anno: number | null, zona: string | null) =>
  useQuery({
    queryKey: ['salute-fonti', anno, zona],
    queryFn: () => api.saluteFonti(anno!, zona!),
    enabled: anno != null && !!zona,
    placeholderData: keepPreviousData,
  })

export const useConfronto = (da: string | null, a: string | null, inquinante: string, fonte: string, distretti: string[],
                             statisticaCalore: StatisticaCalore) =>
  useQuery({
    queryKey: ['confronto', da, a, inquinante, fonte, distretti, statisticaCalore],
    queryFn: () => api.confronto(da!, a!, inquinante, fonte, distretti, statisticaCalore),
    enabled: !!da && !!a && distretti.length > 0,
    placeholderData: keepPreviousData,
  })

export interface IndiceTerritorio {
  province: Provincia[]
  distretti: Map<string, Distretto & { id_provincia: string }>
  comuni: Map<string, Comune & { id_distretto: string }>
  residentiTotali: number
}

export function useIndiceTerritorio(): IndiceTerritorio | null {
  const { data } = useTerritorio()
  return useMemo(() => {
    if (!data) return null
    const distretti = new Map<string, Distretto & { id_provincia: string }>()
    const comuni = new Map<string, Comune & { id_distretto: string }>()
    let residentiTotali = 0
    for (const p of data)
      for (const d of p.distretti) {
        distretti.set(d.id_distretto, { ...d, id_provincia: p.id_provincia })
        for (const c of d.comuni) {
          comuni.set(c.id_comune, { ...c, id_distretto: d.id_distretto })
          residentiTotali += c.residenti ?? 0
        }
      }
    return { province: data, distretti, comuni, residentiTotali }
  }, [data])
}

/** "Martina Franca (5)" per un distretto: il nome della sede, con il solo numero del distretto fra parentesi (27/10/2026);
 *  il nome del comune per un comune. Senza sede resta «Distretto N». */
export function nomeZona(indice: IndiceTerritorio | null, id: string): string {
  if (!indice) return id
  const d = indice.distretti.get(id)
  if (d) {
    // la sigla della provincia distingue i numeri che si ripetono fra le ASL: «Brindisi (BR 1)», «Ginosa (TA 1)»
    const numero = `${d.id_provincia} ${d.denominazione.replace(/\D/g, '') || id}`
    return d.sede ? `${d.sede} (${numero})` : `Distretto ${numero}`
  }
  return indice.comuni.get(id)?.denominazione ?? id
}

/** Etichetta breve: la stessa di `nomeZona`. */
export function nomeBreve(indice: IndiceTerritorio | null, id: string): string {
  return nomeZona(indice, id)
}

export const eDistretto = (id: string) => /^[A-Z]{2}-\d{2}$/.test(id)
