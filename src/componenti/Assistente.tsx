// Chat laterale dell'assistente di una card (31/10/2026, piano del modulo AI §9 e §13). Si apre dal cuore accanto
// all'icona della guida; dal 01/11/2026 su sei card e dal 03/11/2026 su tredici, tutte con la loro scheda dei fatti (una card con la sola
// descrizione avrebbe con_fatti = false e la nota dedicata qui sotto). Il testo del modello arriva già
// verificato (numeri presenti nei fatti, citazioni valide): qui si impagina e basta. Le avvertenze le aggiunge il
// server e si mostrano sempre; i rifiuti sono il messaggio fisso del server, mai riscritto qui.
// Dal 01/11/2026 (Matteo) la chat sta ferma e intera a destra nella finestra principale, non sopra la pagina: la pagina
// si stringe a sinistra. Si apre con un benvenuto e ha due strumenti: nuova chat e copia della conversazione in Markdown.

import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type RefObject } from 'react'
import { createPortal } from 'react-dom'

import { api, type ContestoAssistente, type RispostaAssistente } from '../api/client'
import type { CardAssistente } from '../stato/assistente'
import { useApriGuida } from '../stato/guida'
import { EtichettaEspansa } from './comuni'
import { IconaChiudi, IconaCopia, IconaGuida, IconaMarchio, IconaPiu, IconaSpunta } from './Icone'

const MAX_DOMANDA = 400 // come localhost/rag/config.py: oltre, il server risponde col rifiuto fisso

interface Scambio {
  id: number
  domanda: string
  risposta?: RispostaAssistente
  errore?: unknown
}

/** Testo del modello con le citazioni [f3] / [d1] come numeretti: il numero è la posizione fra i citati, il tooltip
 *  il fatto o la sezione citati. */
function TestoCitato({ r }: { r: RispostaAssistente }) {
  const basi = new Map<string, string>([
    ...r.fatti.map((f): [string, string] => [f.id, f.testo]),
    ...r.sezioni.map((s): [string, string] => [s.id, `${s.titolo}: ${s.testo}`]),
  ])
  const parti = (r.testo ?? '').split(/\[([fd]\d+)\]/)
  return (
    <p className="assistente-testo">
      {parti.map((p, i) => {
        if (i % 2 === 0) return p
        const n = r.citati.indexOf(p) + 1
        return n > 0 ? <sup key={i} className="assistente-citazione" title={basi.get(p)} aria-label={`fonte ${n}`}>{n}</sup> : null
      })}
    </p>
  )
}

/** Fatti e sezioni alla base della risposta: i citati per una risposta, tutti quando il testo del modello non c'è. */
function DatiUsati({ r, aperti }: { r: RispostaAssistente; aperti: boolean }) {
  const tutti = [
    ...r.fatti.map((f) => ({ id: f.id, testo: f.testo })),
    ...r.sezioni.map((s) => ({ id: s.id, testo: `${s.titolo}: ${s.testo}` })),
  ]
  const voci = aperti ? tutti : r.citati.map((id) => tutti.find((t) => t.id === id)).filter((t) => t !== undefined)
  if (!voci.length) return null
  return (
    <details className="assistente-dati" open={aperti}>
      <summary>{aperti ? 'Dati calcolati' : 'Dati usati'} ({voci.length})</summary>
      <ol>
        {voci.map((v, i) => <li key={v.id} value={aperti ? undefined : i + 1}>{v.testo}</li>)}
      </ol>
    </details>
  )
}

/** Testo del modello con le citazioni come in chat: [f3] diventa [n], il numero fra i citati. */
function testoNumerato(r: RispostaAssistente) {
  return (r.testo ?? '').replace(/\[([fd]\d+)\]/g, (_, id: string) => {
    const n = r.citati.indexOf(id) + 1
    return n > 0 ? `[${n}]` : ''
  })
}

/** La conversazione in Markdown, come si legge in chat: domanda, risposta, avvertenze, dati usati (o calcolati). */
function inMarkdown(titolo: string, descrizione: string, scambi: Scambio[]) {
  const righe = [`# ONE: ${titolo}`, '', descrizione, '']
  scambi.forEach((s, i) => {
    righe.push(`## ${i + 1}. ${s.domanda}`, '')
    const r = s.risposta
    if (!r) {
      righe.push(s.errore ? `_Nessuna risposta: ${s.errore instanceof Error ? s.errore.message : String(s.errore)}_` : '_Risposta in preparazione_', '')
      return
    }
    righe.push(r.esito === 'risposta' ? testoNumerato(r) : r.testo ?? '', '')
    if (r.avvertenze.length) righe.push(...r.avvertenze.map((a) => `> ${a}`), '')
    if (r.esito === 'rifiuto') return
    const tutti = [
      ...r.fatti.map((f) => ({ id: f.id, testo: f.testo })),
      ...r.sezioni.map((x) => ({ id: x.id, testo: `${x.titolo}: ${x.testo}` })),
    ]
    const senzaTesto = r.esito === 'non_verificata' || r.esito === 'assistente_spento'
    const voci = senzaTesto ? tutti : r.citati.map((id) => tutti.find((t) => t.id === id)).filter((t) => t !== undefined)
    if (voci.length) righe.push(`**${senzaTesto ? 'Dati calcolati' : 'Dati usati'}**`, '', ...voci.map((v, j) => `${j + 1}. ${v.testo}`), '')
  })
  return righe.join('\n').trimEnd() + '\n'
}

function Risposta({ r }: { r: RispostaAssistente }) {
  const senzaTesto = r.esito === 'non_verificata' || r.esito === 'assistente_spento'
  return (
    <div className={`assistente-risposta esito-${r.esito}`}>
      {r.esito === 'risposta' ? <TestoCitato r={r} /> : <p className="assistente-testo assistente-nota">{r.testo}</p>}
      {r.avvertenze.length > 0 && (
        <ul className="assistente-avvertenze">
          {r.avvertenze.map((a) => <li key={a}>{a}</li>)}
        </ul>
      )}
      {r.esito !== 'rifiuto' && <DatiUsati r={r} aperti={senzaTesto} />}
    </div>
  )
}

export default function Assistente({ colonna, card, titolo, descrizione, contesto, onChiudi, ritorno }: {
  /** Il posto della chat nella finestra principale (App.tsx), dove la chat si disegna. */
  colonna: HTMLElement
  card: CardAssistente
  /** Titolo della card, come in testata («PM2.5 giorno per giorno»). */
  titolo: string
  /** Su cosa si sta parlando, in chiaro: zone, mese, fonte. */
  descrizione: string
  contesto: ContestoAssistente
  onChiudi: () => void
  /** Il cuore che ha aperto la chat: ci torna il fuoco alla chiusura. */
  ritorno: RefObject<HTMLButtonElement | null>
}) {
  const idTitolo = useId()
  const campo = useRef<HTMLTextAreaElement>(null)
  const ultimo = useRef<HTMLElement>(null)
  const corpo = useRef<HTMLDivElement>(null)
  const [testo, setTesto] = useState('')
  const [scambi, setScambi] = useState<Scambio[]>([])
  const [riparte, setRiparte] = useState(false)
  const [copia, setCopia] = useState<'copiata' | 'errore' | null>(null)

  // Una domanda resta sulla stessa scheda: se la card cambia zone, mese, inquinante o fonte la conversazione riparte
  // e lo dice (piano §5.5). Stato aggiornato durante il render, il modo di React per «derivare» da una prop.
  const chiave = JSON.stringify(contesto)
  const [chiavePrima, setChiavePrima] = useState(chiave)
  if (chiave !== chiavePrima) {
    setChiavePrima(chiave)
    if (scambi.length) {
      setScambi([])
      setRiparte(true)
    }
  }

  const stato = useQuery({ queryKey: ['assistente-stato'], queryFn: api.assistenteStato, staleTime: 30_000 })
  const proposte = useQuery({ queryKey: ['assistente-domande', card], queryFn: () => api.assistenteDomande(card), staleTime: Infinity })
  const chiedi = useMutation({ mutationFn: api.assistenteChiedi })
  // come ogni scheda, anche la chat rimanda a Informazioni (sottoargomento «Cosa fa»); aprirla chiude la chat
  const apriGuida = useApriGuida()

  // all'apertura il fuoco va nel campo, alla chiusura torna al cuore; Esc chiude. Una volta sola: onChiudi cambia a
  // ogni render della card e rilanciare l'effetto farebbe saltare il fuoco
  const chiudi = useRef(onChiudi)
  chiudi.current = onChiudi
  useEffect(() => {
    campo.current?.focus()
    const torna = ritorno.current
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') chiudi.current() }
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('keydown', esc)
      torna?.focus()
    }
  }, [ritorno])

  // si legge dalla domanda in giù: l'ultimo scambio sale in cima, anche quando la risposta è lunga
  useEffect(() => {
    // solo il corpo della chat scorre: scrollIntoView sposterebbe anche la pagina
    const c = corpo.current, u = ultimo.current
    if (c && u) c.scrollTop += u.getBoundingClientRect().top - c.getBoundingClientRect().top
  }, [scambi])

  const invia = (domanda: { testo: string; proposta?: string }) => {
    if (chiedi.isPending) return
    const id = Date.now()
    setRiparte(false)
    setScambi((s) => [...s, { id, domanda: domanda.testo }])
    chiedi.mutate(
      { card, contesto, ...(domanda.proposta ? { id_domanda_proposta: domanda.proposta } : { domanda: domanda.testo }) },
      {
        onSuccess: (r) => setScambi((s) => s.map((x) => (x.id === id ? { ...x, risposta: r } : x))),
        onError: (e) => setScambi((s) => s.map((x) => (x.id === id ? { ...x, errore: e } : x))),
      },
    )
  }
  const inviaLibera = (e?: FormEvent) => {
    e?.preventDefault()
    const t = testo.trim()
    if (!t || chiedi.isPending) return // il testo resta nel campo finché la risposta precedente non è arrivata
    setTesto('')
    invia({ testo: t })
  }
  const nuovaChat = () => {
    setScambi([])
    setRiparte(false)
    setTesto('')
    campo.current?.focus()
  }
  const copiaMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(inMarkdown(titolo, descrizione, scambi))
      setCopia('copiata')
    } catch {
      setCopia('errore') // appunti negati dal browser
    }
    setTimeout(() => setCopia(null), 2000)
  }
  const tasto = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) inviaLibera(e)
  }

  return createPortal(
    <aside className="assistente" aria-label={`ONE: ${titolo}`}>
      {/* testata (01/11/2026, Matteo): in alto il marchio ONE a sinistra e i quattro strumenti a sola icona a destra (nuova
          chat, copia in Markdown, come leggere, chiudi; al passaggio l'etichetta esce verso sinistra, dopo la copia resta
          aperta per dire com'è andata); sotto il titolo del blocco e il suo contesto */}
      <header className="assistente-testa">
        <div className="assistente-barra">
          <span className="assistente-marchio">
            <span className="marchio-segno" aria-hidden="true"><IconaMarchio dim={24} /></span>
            <span className="assistente-nome">ONE</span>
          </span>
          <div className="assistente-strumenti" role="toolbar" aria-label="Strumenti della chat">
            <button type="button" className="come-leggere con-etichetta" onClick={nuovaChat} disabled={!scambi.length && !riparte} aria-label="Nuova chat">
              <EtichettaEspansa testo="Nuova chat" /><IconaPiu dim={18} />
            </button>
            <button type="button" className={`come-leggere con-etichetta${copia ? ' aperto' : ''}`} onClick={copiaMarkdown} disabled={!scambi.length}
                    aria-label="Copia in Markdown">
              <EtichettaEspansa testo={copia === 'copiata' ? 'Copiata' : copia === 'errore' ? 'Copia non riuscita' : 'Copia in Markdown'} />
              {copia === 'copiata' ? <IconaSpunta dim={18} /> : <IconaCopia dim={18} />}
            </button>
            <button type="button" className="come-leggere con-etichetta" onClick={() => apriGuida('assistente')} aria-label="Come leggere: ONE, l'assistente">
              <EtichettaEspansa testo="Come leggere" /><IconaGuida dim={22} />
            </button>
            <button type="button" className="come-leggere con-etichetta" onClick={onChiudi} aria-label="Chiudi ONE (Esc)">
              <EtichettaEspansa testo="Chiudi" /><IconaChiudi dim={18} />
            </button>
            {copia && <span className="sr-only" role="status">{copia === 'copiata' ? 'Conversazione copiata' : 'Copia non riuscita'}</span>}
          </div>
        </div>
        <h2 id={idTitolo} className="assistente-titolo">{titolo}</h2>
        <p className="assistente-sottotitolo">{descrizione}</p>
      </header>

      {stato.data && !stato.data.pronto && (
        <p className="assistente-spento">Il modello locale non è attivo: le domande ricevono i soli dati calcolati, senza commento.</p>
      )}

      <div ref={corpo} className="assistente-corpo" aria-live="polite">
        {riparte && <p className="assistente-nota">La scheda è cambiata: la conversazione riparte sui dati nuovi.</p>}
        {!scambi.length && (
          <div className="assistente-benvenuto">
            <p className="assistente-saluto">Benvenuto, sono ONE, l'assistente di OneHealth per «{titolo}».</p>
            <p className="assistente-nota">
              {proposte.data && !proposte.data.con_fatti
                ? 'Su questa scheda, per ora, spiego cosa mostra, quali dati contiene e come si legge, e rispondo sul progetto: le domande sui numeri arriveranno.'
                : 'Rispondo solo su questa scheda e sul progetto, con i dati calcolati dal sistema.'}
              {' '}Giro su questo computer: le domande non escono dalla workstation. Scegli una domanda qui sotto o scrivi la tua.
            </p>
          </div>
        )}
        {scambi.map((s, i) => (
          <section key={s.id} ref={i === scambi.length - 1 ? ultimo : undefined} className="assistente-scambio">
            <p className="assistente-domanda">{s.domanda}</p>
            {s.risposta ? <Risposta r={s.risposta} />
              : s.errore ? (
                <div className="vuoto vuoto-errore" role="alert">
                  <strong>Nessuna risposta</strong>
                  <p>{s.errore instanceof Error ? s.errore.message : String(s.errore)}</p>
                </div>
              )
              : <p className="assistente-attesa" role="status"><span className="barra-caricamento" aria-hidden="true" />Sto preparando la risposta…</p>}
          </section>
        ))}
      </div>

      <footer className="assistente-piede">
        {proposte.data && (
          <div className="assistente-proposte" role="group" aria-label="Domande proposte">
            {proposte.data.domande.map((d) => (
              <button key={d.id} type="button" className="pillola pillola-piccola" disabled={chiedi.isPending}
                      onClick={() => invia({ testo: d.testo, proposta: d.id })}>
                {d.testo}
              </button>
            ))}
          </div>
        )}
        <form className="assistente-modulo" onSubmit={inviaLibera}>
          <label className="sr-only" htmlFor={`${idTitolo}-domanda`}>La tua domanda</label>
          <textarea id={`${idTitolo}-domanda`} ref={campo} rows={2} maxLength={MAX_DOMANDA} value={testo}
                    placeholder="Fai una domanda su questa scheda" onChange={(e) => setTesto(e.target.value)} onKeyDown={tasto} />
          <button type="submit" className="pillola pillola-attiva" disabled={chiedi.isPending || !testo.trim()}>Chiedi</button>
        </form>
        {testo.length > MAX_DOMANDA - 80 && <p className="assistente-conta">{testo.length} / {MAX_DOMANDA} caratteri</p>}
      </footer>
    </aside>,
    colonna,
  )
}
