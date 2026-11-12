// Chiamate all'API locale (localhost/server, FastAPI). I tipi vengono da schema.d.ts, generato dallo schema
// OpenAPI del server con `npm run tipi`: una sola definizione di VALORE/NULL/NO_DATA per backend e frontend.

import type { components } from './schema'

type S = components['schemas']

/** Vista «tutte le fonti» (14/10/2026): non è una fonte, è la media delle fonti concordi calcolata dal server. */
export const FONTE_ACCORPATA = 'Tutte'
export type Stato = S['CellaMensile']['stato']
export type Provincia = S['ProvinciaTerritorio']
export type Distretto = S['DistrettoTerritorio']
export type Comune = S['ComuneTerritorio']
export type Disponibilita = S['RispostaDisponibilita']
export type StatoServizio = S['StatoServizio']

/** Versione dell'API con cui questa dashboard è stata scritta: se il server dichiara un'altra versione, un avviso lo dice
 *  (Backend e Frontend vanno insieme, con lo stesso tag). */
export const VERSIONE_API_ATTESA = '1.0.0'
export type InfoInquinante = S['InfoInquinante']
export type AriaMese = S['RispostaAriaMese']
type CalendarioAria = S['RispostaCalendarioAria']
export type PeriodoCompleto = S['PeriodoCompleto']
type AriaFinestra = S['RispostaAriaFinestra']
export type DettaglioZona = S['RispostaDettaglioZona']
export type SalubritaZona = S['SalubritaZona']
export type SalubritaInquinante = S['SalubritaInquinante']
export type EsitoRiferimento = S['EsitoRiferimento']
export type SalubritaMappa = S['RispostaSalubritaMappa']
export type SalubritaZonaMappa = S['SalubritaZonaMappa']
export type Banda = SalubritaZona['banda']
export type CellaMensile = S['CellaMensile']
export type CaloreMappa = S['RispostaCaloreMappa']
export type SaluteMappa = S['RispostaSaluteMappa']
export type InfoFonte = S['InfoFonte']
export type StazioneMappa = S['StazioneMappa']
type SerieAria = S['RispostaSerieAria']
export type PuntoGiorno = S['PuntoGiorno']
type FontiAria = S['RispostaFontiAria']
export type ConfrontoFonti = S['ConfrontoFonti']
export type FontiCalore = S['RispostaFontiCalore']
export type ConfrontoTemperatura = S['ConfrontoTemperatura']
export type FontiSalute = S['RispostaFontiSalute']
export type SerieFontePeriodo = S['SerieFontePeriodo']
export type ConfrontoConteggi = S['ConfrontoConteggi']
export type Decessi = S['RispostaDecessi']
export type PuntoDecessi = S['PuntoDecessi']
export type Dimissioni = S['RispostaDimissioni']
export type SerieDimissioni = S['SerieDimissioni']
export type PuntoDimissioni = S['PuntoDimissioni']
export type DettaglioDimissioni = S['DettaglioDimissioni']
export type ValoreDimissioni = S['ValoreDimissioni']
export type Confronto = S['RispostaConfronto']
export type StatisticaCalore = Confronto['statistica_calore']
export type PuntoMese = S['PuntoMese']
export type ZonaRif = S['ZonaRif']
export type Riepilogo = S['RispostaRiepilogo']
export type ColonnaRiepilogo = S['ColonnaRiepilogo']
export type CellaRiepilogo = S['CellaRiepilogo']
export type Stagionalita = S['RispostaStagionalita']
export type RigaStagionalita = S['RigaStagionalita']
export type MeseStagione = S['MeseStagione']
export type CellaStagione = S['CellaStagione']
export type AndamentoStagione = S['AndamentoStagione']
export type CriticitaAnno = S['CriticitaAnno']
export type PeriodoCriticita = S['PeriodoCriticita']
export type MotivoCriticita = S['MotivoCriticita']
export type TemaCriticita = S['TemaCriticita']
export type SpuntoCriticita = S['SpuntoCriticita']
export type InfoSimulati = S['InfoSimulati']
export type DettaglioSimulati = S['DettaglioSimulati']
export type ValoreSimulato = S['ValoreSimulato']
export type SerieSimulata = S['RispostaSerieSimulata']
export type PuntoSimulato = S['PuntoSimulato']
/** Assistente per card. */
export type StatoAssistente = S['StatoAssistente']
export type ContestoAssistente = S['ContestoAssistente']
export type DomandaProposta = S['DomandaProposta']
export type RispostaAssistente = S['RispostaAssistente']
export type FattoAssistente = S['FattoAssistente']
export type SezioneAssistente = S['SezioneAssistente']
type DomandeAssistente = S['RispostaDomandeAssistente']
type DomandaAssistente = S['DomandaAssistente']
/** Scenario dei dati sanitari simulati (25/10/2026): `letteratura` (effetto di aria e caldo dalla letteratura,
 *  usato in tesi) o `nullo` (solo popolazione, stagione e caso). */
export type Scenario = 'letteratura' | 'nullo'

export interface ProprietaDistretto {
  id_distretto: string
  id_provincia: string
  denominazione: string
  sede: string
  etichetta: [number, number]
}
export interface ProprietaComune {
  nome: string
  id_distretto: string
  area_kmq: number
  id_comuni: string[]
}
export interface Confini {
  distretti: GeoJSON.FeatureCollection<GeoJSON.Geometry, ProprietaDistretto>
  comuni: GeoJSON.FeatureCollection<GeoJSON.Geometry, ProprietaComune>
}

class ErroreApi extends Error {
  stato: number
  constructor(stato: number, messaggio: string) {
    super(messaggio)
    this.stato = stato
  }
}

async function leggi<T>(percorso: string, parametri?: Record<string, string>, init?: RequestInit): Promise<T> {
  const url = parametri ? `${percorso}?${new URLSearchParams(parametri)}` : percorso
  let risposta: Response
  try {
    risposta = await fetch(url, init)
  } catch {
    // solo la frase (fase 6, 29/10/2026): il comando per avviare il server è nel README
    throw new ErroreApi(0, 'Il server locale dei dati non risponde: probabilmente non è avviato.')
  }
  if (!risposta.ok) {
    let dettaglio = risposta.statusText
    try {
      const corpo = await risposta.json()
      dettaglio = typeof corpo.detail === 'string' ? corpo.detail : JSON.stringify(corpo.detail)
    } catch {
      /* corpo non JSON: resta lo statusText */
    }
    throw new ErroreApi(risposta.status, dettaglio)
  }
  return risposta.json() as Promise<T>
}

/** POST con un corpo JSON (l'assistente: la domanda non va nell'indirizzo). */
const invia = <T>(percorso: string, corpo: unknown) =>
  leggi<T>(percorso, undefined, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) })

/** Come `leggi`, ma un 404 (dataset non generato per quel periodo) diventa `null` invece di un errore. */
async function leggiOpzionale<T>(percorso: string, parametri?: Record<string, string>): Promise<T | null> {
  try {
    return await leggi<T>(percorso, parametri)
  } catch (e) {
    if (e instanceof ErroreApi && e.stato === 404) return null
    throw e
  }
}

export const api = {
  territorio: () => leggi<Provincia[]>('/api/territorio'),
  confini: () => leggi<Confini>('/api/territorio/confini'),
  stato: () => leggi<StatoServizio>('/api/stato'),
  disponibilita: () => leggi<Disponibilita>('/api/disponibilita'),
  ariaCalendario: () => leggi<CalendarioAria>('/api/aria/calendario'),
  ariaFinestra: (da: string, a: string, fonte: string) => leggiOpzionale<AriaFinestra>('/api/aria/finestra', { da, a, fonte }),
  ariaSalubrita: (da: string, a: string) => leggiOpzionale<SalubritaMappa>('/api/aria/salubrita', { da, a }),
  caloreMappa: (da: string, a: string) => leggiOpzionale<CaloreMappa>('/api/calore/mappa', { da, a }),
  saluteMappa: (da: string, a: string, scenario: Scenario) => leggiOpzionale<SaluteMappa>('/api/salute/mappa', { da, a, scenario }),
  zonaDettaglio: (zona: string, da: string, a: string, scenario: Scenario) =>
    leggi<DettaglioZona>('/api/zona/dettaglio', { zona, da, a, scenario }),
  simulatiFinestra: (zona: string, da: string, a: string, scenario: Scenario) =>
    leggiOpzionale<DettaglioSimulati>('/api/salute/simulati/finestra', { zona, da, a, scenario }),
  simulatiSerie: (da: string, a: string, indicatore: string, zone: string[]) =>
    leggiOpzionale<SerieSimulata>('/api/salute/simulati/serie', { da, a, indicatore, zone: zone.join(',') }),
  ariaSerie: (mese: string, inquinante: string, fonte: string, zone: string[]) =>
    leggi<SerieAria>('/api/aria/serie', { mese, inquinante, fonte, zone: zone.join(',') }),
  ariaFonti: (mese: string, inquinante: string, zona: string) =>
    leggi<FontiAria>('/api/aria/fonti', { mese, inquinante, zona }),
  caloreFonti: (mese: string, zona: string, statistica: string) =>
    leggi<FontiCalore>('/api/calore/fonti', { mese, zona, statistica }),
  saluteFonti: (anno: number, zona: string) => leggiOpzionale<FontiSalute>('/api/salute/fonti', { anno: String(anno), zona }),
  decessi: (da: string, a: string) => leggiOpzionale<Decessi>('/api/salute/decessi', { da, a }),
  dimissioni: (da: number, a: number, province: string[], gruppi: string[]) =>
    leggiOpzionale<Dimissioni>('/api/salute/dimissioni', { da: String(da), a: String(a), province: province.join(','), gruppi: gruppi.join(',') }),
  riepilogo: (da: string, a: string, fonte: string, scenario: Scenario) => leggi<Riepilogo>('/api/riepilogo', { da, a, fonte, scenario }),
  stagionalita: (zona: string, fonte: string, scenario: Scenario, simulatiNellaSintesi: boolean) =>
    leggi<Stagionalita>('/api/stagionalita', { zona, fonte, scenario, simulati_nella_sintesi: String(simulatiNellaSintesi) }),
  confronto: (da: string, a: string, inquinante: string, fonte: string, distretti: string[], statisticaCalore: StatisticaCalore) =>
    leggi<Confronto>('/api/confronto', { da, a, inquinante, fonte, distretti: distretti.join(','), statistica_calore: statisticaCalore }),
  assistenteStato: () => leggi<StatoAssistente>('/api/assistente/stato'),
  assistenteDomande: (card: string) => leggi<DomandeAssistente>('/api/assistente/domande', { card }),
  assistenteChiedi: (domanda: DomandaAssistente) => invia<RispostaAssistente>('/api/assistente', domanda),
}
