// Pezzi condivisi: card, valore con stato, badge, stato vuoto, avvertenza.

import { useRef, type ReactNode } from 'react'

import type { ContestoAssistente, Stato } from '../api/client'
import { numero } from '../lib/formato'
import { coloreBanda, ETICHETTA_BANDA, type Banda } from '../lib/salubrita'
import { useChat, type CardAssistente } from '../stato/assistente'
import { useDisponibilita } from '../stato/dati'
import { titoloSezione, useApriGuida, type SezioneGuida } from '../stato/guida'
import Assistente from './Assistente'
import { IconaDivieto, IconaGuida, IconaInformazioni, IconaMarchio, IconaModellato, IconaNonUtilizzabile, IconaScarica, IconaSimulato } from './Icone'

/** Etichetta di un pulsante a sola icona (01/11/2026, Matteo): al passaggio esce dall'icona come una pillola, verso
 *  sinistra o verso destra, sopra ciò che sta accanto (app.css, .con-etichetta). Il pulsante ha il suo aria-label:
 *  l'etichetta è solo da vedere. Si mette prima dell'icona. */
export function EtichettaEspansa({ testo, verso = 'sinistra' }: { testo: string; verso?: 'sinistra' | 'destra' }) {
  return <span className={`etichetta-espansa${verso === 'destra' ? ' verso-destra' : ''}`} aria-hidden="true">{testo}</span>
}

/** «Scarica CSV» a sola icona, come la guida (01/11/2026, Matteo): l'etichetta esce al passaggio. */
export function ScaricaCsv({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" className="come-leggere con-etichetta" onClick={onClick} disabled={disabled} aria-label="Scarica CSV">
      <EtichettaEspansa testo="Scarica CSV" /><IconaScarica dim={18} />
    </button>
  )
}

/** Rimando al sottoargomento della tab Informazioni che spiega una scheda (29/10/2026): le spiegazioni stanno solo lì.
 *  Dal 31/10/2026 (scelta di Matteo) è la sola icona della guida, più grande, al posto della scritta «come leggere»:
 *  il nome del sottoargomento sta nel tooltip e nel nome accessibile. */
export function ComeLeggere({ sezione }: { sezione: SezioneGuida }) {
  const apri = useApriGuida()
  const nome = `Come leggere: ${titoloSezione(sezione)}`
  return (
    <button type="button" className="come-leggere con-etichetta" onClick={() => apri(sezione)} aria-label={nome}>
      <EtichettaEspansa testo="Come leggere" /><IconaGuida dim={22} />
    </button>
  )
}

/** Cosa serve all'assistente di una card: la card (con una scheda dei fatti nel server), come nominarla nella chat e il
 *  contesto da mandare al server; `contesto` null = la card non ha ancora dati su cui rispondere (cuore disattivato). */
export interface AssistenteCard {
  card: CardAssistente
  titolo: string
  descrizione: string
  contesto: ContestoAssistente | null
}

/** Il cuore del marchio (la favicon), subito a sinistra dell'icona della guida (31/10/2026, scelta di Matteo): apre la
 *  chat laterale dell'assistente. Solo sulle card dell'elenco di localhost/rag/schede.py (CARD): dal 01/11/2026 sei,
 *  dal 03/11/2026 tredici, tutte con la loro scheda dei fatti. */
function CuoreAssistente({ assistente }: { assistente: AssistenteCard }) {
  const { aperta, apri, colonna } = useChat()
  const bottone = useRef<HTMLButtonElement>(null)
  const attiva = aperta === assistente.card && assistente.contesto !== null
  const nome = assistente.contesto ? `Chiedi a ONE: ${assistente.titolo}` : "ONE: scegli almeno una zona con dati"
  return (
    <>
      <button ref={bottone} type="button" className="come-leggere cuore-assistente con-etichetta" aria-pressed={attiva} aria-label={nome}
              title={assistente.contesto ? undefined : nome} disabled={!assistente.contesto} onClick={() => apri(attiva ? null : assistente.card)}>
        <EtichettaEspansa testo={attiva ? 'Chiudi ONE' : 'Chiedi a ONE'} /><IconaMarchio dim={24} />
      </button>
      {attiva && assistente.contesto && colonna && (
        <Assistente colonna={colonna} card={assistente.card} titolo={assistente.titolo} descrizione={assistente.descrizione}
                    contesto={assistente.contesto} onChiudi={() => apri(null)} ritorno={bottone} />
      )}
    </>
  )
}

export function Card({ titolo, icona, sottotitolo, azioni, guida, assistente, children, className = '', id, tabella, caricamento = false }: {
  titolo?: ReactNode
  /** Icona del dominio davanti al titolo (29/10/2026): solo per le schede di un dominio. */
  icona?: ReactNode
  sottotitolo?: ReactNode
  azioni?: ReactNode
  /** Sottoargomento di Informazioni che spiega la scheda: l'icona della guida in fondo alle azioni. */
  guida?: SezioneGuida
  /** Assistente della card: il cuore a sinistra della guida. Solo per le card con una scheda dei fatti nel server. */
  assistente?: AssistenteCard
  children: ReactNode
  className?: string
  id?: string
  /** Tabelle del grafico: non si mostrano, alimentano il pulsante «Scarica CSV». */
  tabella?: ReactNode
  /** Dati in arrivo: barra di caricamento in cima alla scheda (non blocca la vista, restano i dati precedenti). */
  caricamento?: boolean
}) {
  const nascosta = useRef<HTMLDivElement>(null)
  /** CSV dalle tabelle della scheda: una per blocco, col titolo del blocco sopra; i valori sono quelli grezzi (`data-csv`). */
  const scaricaCsv = () => {
    const radice = nascosta.current
    if (!radice) return
    const campo = (t: string) => `"${t.replace(/\s+/g, ' ').trim().replace(/"/g, '""')}"`
    const righe: string[] = []
    radice.querySelectorAll('table').forEach((tab) => {
      const titolo = tab.closest('.tabella-scorre')?.previousElementSibling
      if (righe.length) righe.push('')
      if (titolo?.tagName === 'H3' && titolo.textContent) righe.push(campo(titolo.textContent))
      tab.querySelectorAll('tr').forEach((tr) => {
        righe.push([...tr.children].map((c) => campo((c as HTMLElement).dataset.csv ?? c.textContent ?? '')).join(';'))
      })
    })
    const nome = (typeof titolo === 'string' ? titolo : id ?? 'grafico').replace(/[^0-9A-Za-z]+/g, '_').toLowerCase()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([`﻿${righe.join('\r\n')}`], { type: 'text/csv;charset=utf-8' }))
    a.download = `onehealth_${nome}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  return (
    <section className={`card ${className}`} id={id} aria-busy={caricamento || undefined}>
      {caricamento && <div className="barra-caricamento" role="progressbar" aria-label="Caricamento dei dati" />}
      {(titolo || azioni || tabella || guida || assistente) && (
        <header className="card-testa">
          <div>
            {titolo && <h2 className="card-titolo">{icona && <span className="card-icona" aria-hidden="true">{icona}</span>}{titolo}</h2>}
            {sottotitolo && <p className="card-sottotitolo">{sottotitolo}</p>}
          </div>
          <div className="card-azioni">
            {azioni}
            {tabella && (
              <ScaricaCsv onClick={scaricaCsv} />
            )}
            {assistente && <CuoreAssistente assistente={assistente} />}
            {guida && <ComeLeggere sezione={guida} />}
          </div>
        </header>
      )}
      {tabella && <div ref={nascosta} hidden>{tabella}</div>}
      {children}
    </section>
  )
}

export const ETICHETTA_STATO: Record<Stato, string> = {
  VALORE: 'valore',
  NULL: 'null', // breve, per stringere le tabelle: la spiegazione è nel tooltip e in Informazioni
  NO_DATA: 'N/D',
}

const SPIEGAZIONE_STATO: Record<Stato, string> = {
  VALORE: 'valore numerico valido',
  NULL: 'la fonte copre la zona ma il valore non è utilizzabile',
  NO_DATA: 'la fonte non copre la zona (nessuna stazione o inquinante non misurato)',
}

/** Valore con unità, oppure lo stato esplicito: mai una cella vuota o uno zero inventato. */
export function Valore({ valore, stato, unita, nota, formato = numero }: {
  valore: number | null | undefined
  stato: Stato
  unita?: string | null
  nota?: string | null
  formato?: (v: number) => string
}) {
  if (stato === 'VALORE' && valore != null)
    return (
      <span className="valore" title={nota ?? undefined}>
        {formato(valore)}
        {unita && <small> {unita}</small>}
      </span>
    )
  return <StatoDato stato={stato} nota={nota} />
}

/** Segno di uno stato del dato (29/10/2026, scelta di Matteo): un'icona su un pallino del colore dello stato al posto
 *  della parola, il perché nel tooltip. I lettori di schermo leggono il tooltip intero, perché compreso (30/10/2026);
 *  la parola resta, nascosta a vista e a loro, solo per il CSV delle schede (che legge il testo delle celle).
 *  Legenda dei segni nella tab Informazioni. */
export function Segno({ tipo, titolo, testo, dim = 18 }: {
  tipo: 'simulato' | 'modellato' | 'nodata' | 'null'
  titolo: string
  /** Parola per i lettori di schermo e il CSV. */
  testo: string
  dim?: number
}) {
  const Icona = { simulato: IconaSimulato, modellato: IconaModellato, nodata: IconaDivieto, null: IconaNonUtilizzabile }[tipo]
  // beuta e cubo stanno dentro il pallino; divieto e punto esclamativo sono già un cerchio e lo riempiono
  const pieno = tipo === 'simulato' || tipo === 'modellato'
  return (
    <span className={`segno segno-${tipo}`} title={titolo} role="img" aria-label={titolo} style={{ ['--dim' as string]: `${dim}px` }}>
      <Icona dim={Math.round(dim * (pieno ? 0.72 : 0.95))} />
      <span className="sr-only" aria-hidden="true">{testo}</span>
    </span>
  )
}

/** N/D o null come segno, col motivo nel tooltip: la forma unica di ogni dato mancante. */
export function StatoDato({ stato, nota, dim }: { stato: Stato; nota?: string | null; dim?: number }) {
  const nullo = stato === 'NULL'
  return <Segno tipo={nullo ? 'null' : 'nodata'} titolo={`${nullo ? 'Non utilizzabile' : 'Non disponibile (N/D)'}: ${nota ?? SPIEGAZIONE_STATO[stato]}`}
                testo={ETICHETTA_STATO[stato]} dim={dim} />
}

/** Dato modellato: cubo su pallino crema (29/10/2026; fino ad allora la scritta «dato modellato»). */
export function BadgeModellato({ titolo, dim }: { titolo?: string; dim?: number }) {
  return <Segno tipo="modellato" dim={dim} testo="dato modellato"
                titolo={titolo ?? "Dato modellato, non misurato: Copernicus CAMS per l'aria (griglia di circa 10 km), ERA5-Land per la temperatura (circa 9 km)"} />
}

/** Dato sanitario simulato: beuta sul pallino giallo del marchio (29/10/2026, scelta di Matteo: solo l'icona, senza
 *  la scritta). La dicitura completa (letta da /api/disponibilita, mai ricopiata qui) sta nel tooltip e, per i lettori
 *  di schermo, la versione breve «Dato simulato, non reale». `testo` aggiunge una parola visibile dove serve un'informazione
 *  in più (es. «fuori sintesi»). Accanto a ogni card, sezione, riga o colonna che li mostra. */
export function BadgeSimulato({ testo, dim }: { testo?: string; dim?: number }) {
  const info = useDisponibilita().data?.simulati
  const breve = info?.dicitura_breve ?? 'Dato simulato, non reale'
  const segno = <Segno tipo="simulato" dim={dim} testo={breve}
                       titolo={`${breve}. ${info?.dicitura ?? 'Dati sanitari simulati: non descrivono la situazione sanitaria reale del Salento.'}`} />
  return testo ? <span className="segno-con-testo">{segno}<small>{testo}</small></span> : segno
}

/** Limite del D.Lgs. 155/2010 toccato (Stagionalità, 29/10/2026, Fase 5): un piccolo angolo rosso al posto del «!» e
 *  del bordo rosso attorno alla cella, il dettaglio nel tooltip. In una cella dei mesi sta nell'angolo in alto a destra. */
export function SegnoLimite({ titolo }: { titolo?: string }) {
  return (
    <span className="segno-limite" title={titolo ?? 'Limite del D.Lgs. 155/2010 toccato'}>
      <span className="sr-only">limite superato</span>
    </span>
  )
}

/** Banda di salubrità come solo pallino (29/10/2026, scelta di Matteo): la parola («buona», «accettabile»…) nel tooltip
 *  e per i lettori di schermo. Le parole restano nelle legende, dove spiegano i colori. */
export function PallinoBanda({ banda, titolo }: { banda: Banda; titolo?: string }) {
  return (
    <span className="pallino-banda" title={titolo ?? ETICHETTA_BANDA[banda]}>
      <Pallino colore={coloreBanda(banda)} />
      <span className="sr-only">{ETICHETTA_BANDA[banda]}</span>
    </span>
  )
}

export function Vuoto({ titolo, children }: { titolo: string; children?: ReactNode }) {
  return (
    <div className="vuoto">
      <strong>{titolo}</strong>
      {children && <p>{children}</p>}
    </div>
  )
}

/** Al posto di un grafico che non ha (ancora) dati: stessa altezza, così la pagina non salta, e una frase che dice
 *  perché è vuoto. Prima restava una griglia senza linee, che sembrava un errore. */
export function GraficoVuoto({ altezza, children }: { altezza: number; children: ReactNode }) {
  return (
    <div className="grafico-vuoto" style={{ height: altezza }} role="status">
      <p>{children}</p>
    </div>
  )
}

export function Errore({ errore }: { errore: unknown }) {
  return (
    <div className="vuoto vuoto-errore" role="alert">
      <strong>Dati non disponibili</strong>
      <p>{errore instanceof Error ? errore.message : String(errore)}</p>
    </div>
  )
}

export function Avvertenza({ testo }: { testo: string }) {
  return (
    <p className="avvertenza">
      <span aria-hidden="true"><IconaInformazioni /></span>
      {testo}
    </p>
  )
}

/** Pallino del colore di una zona o di una fonte, accanto al nome (il nome resta nel colore del testo). */
export function Pallino({ colore, tratteggio = false }: { colore: string; tratteggio?: boolean }) {
  return <i className={`pallino${tratteggio ? ' pallino-tratteggio' : ''}`} style={{ ['--c' as string]: colore }} aria-hidden="true" />
}
