// Rimandi alla guida (fase 4 della revisione, 29/10/2026): le spiegazioni stanno solo nella tab Informazioni e ogni
// scheda vi rimanda. Dal 31/10/2026 (scelta di Matteo) Informazioni è divisa per argomenti e sottoargomenti, non più
// per compito, e il rimando è la sola icona della guida, che apre il sottoargomento che spiega la scheda. Qui la
// struttura (indice, titoli, ancore); il contesto dà a qualsiasi scheda la funzione che apre Informazioni sul
// sottoargomento giusto, senza passarla di componente in componente.

import { createContext, useContext } from 'react'

/** Argomenti di Informazioni, nell'ordine della pagina, ciascuno con i suoi sottoargomenti [ancora, titolo]. */
export const ARGOMENTI = [
  { id: 'segni', titolo: 'Segni e stati', sotto: [['segni', 'Valori e vuoti'], ['segni-origine', 'Da dove viene il dato']] },
  { id: 'pagina', titolo: 'Periodo e navigazione', sotto: [['finestra', 'Testata e finestra'], ['domini', 'Domini nella finestra'], ['barra', 'Barra laterale']] },
  { id: 'carta', titolo: 'Carta e zone', sotto: [['carta', 'Usare la carta'], ['scheda', 'Scheda della zona'], ['ricerca', 'Cerca una zona'], ['colori', 'Colori e vuoti'], ['aggregazione', 'Distretto, comune e confronto']] },
  { id: 'grafici', titolo: 'Numeri, grafici e Riepilogo', sotto: [['numeri', 'Sintesi della finestra'], ['giorno', 'Giorno per giorno'], ['domini-mese', 'Aria e salute per distretto e mese'], ['riepilogo', 'Riepilogo']] },
  { id: 'stagionalita', titolo: 'Stagionalità', sotto: [['stagionalita', 'Dove guarda'], ['consiglio', 'Il consiglio'], ['periodi', 'Periodi critici'], ['rango', 'Rango'], ['mesi', '12 mesi a confronto'], ['dettaglio-mese', 'Un mese anno per anno'], ['anno-su-anno', 'Anno su anno'], ['cambiamenti', 'Cosa sta cambiando']] },
  { id: 'aria', titolo: 'Aria', sotto: [['aria-tutte', 'La vista «Tutte»'], ['aria-confronto', 'Fonti a confronto: aria'], ['limiti', 'Limiti di legge e salubrità']] },
  { id: 'calore', titolo: 'Calore', sotto: [['calore', 'Temperatura'], ['mitigazione', 'Alberi e suolo'], ['calore-confronto', 'Fonti a confronto: temperatura'], ['verde', 'Verde urbano ISTAT']] },
  { id: 'salute', titolo: 'Salute', sotto: [['decessi', 'Decessi e ricoveri'], ['vista-salute', 'Vista Salute della carta'], ['decessi-confronto', 'Fonti a confronto: decessi'], ['simulati', 'Dati simulati: perché e cosa'], ['scenari', 'Scenari, calibrazione e verifica']] },
  { id: 'assistente', titolo: 'Assistente ONE', sotto: [['assistente', 'Cosa fa'], ['assistente-iniziativa', 'Lo scopo: medicina di iniziativa'], ['assistente-risposta', 'Leggere una risposta'], ['assistente-rifiuti', 'Cosa rifiuta'], ['assistente-locale', 'Gira in locale']] },
  { id: 'licenze', titolo: 'Fonti e licenze', sotto: [['licenze-aria', 'Aria'], ['licenze-calore', 'Calore e mitigazione'], ['licenze-salute', 'Salute'], ['licenze-carta', 'Carta e caratteri'], ['licenze-assistente', 'Assistente']] },
] as const

export type Argomento = (typeof ARGOMENTI)[number]
export type SezioneGuida = Argomento['sotto'][number][0]

/** Sottoargomenti nell'ordine della pagina. */
export const SEZIONI_GUIDA: readonly SezioneGuida[] = ARGOMENTI.flatMap((a) => a.sotto.map(([id]) => id))

const TITOLO = new Map<string, string>(ARGOMENTI.flatMap((a) => a.sotto.map(([id, titolo]) => [id, titolo] as [string, string])))
export const titoloSezione = (id: SezioneGuida) => TITOLO.get(id) ?? ''
export const argomentoDi = (id: SezioneGuida) => ARGOMENTI.find((a) => a.sotto.some(([s]) => s === id))!

export const eSezioneGuida = (s: string): s is SezioneGuida => TITOLO.has(s)

const ContestoGuida = createContext<(sezione: SezioneGuida) => void>(() => {})

export const GuidaProvider = ContestoGuida.Provider
export const useApriGuida = () => useContext(ContestoGuida)
