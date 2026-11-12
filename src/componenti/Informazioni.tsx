// Tab Informazioni: l'unico posto delle spiegazioni della dashboard (fase 4 della revisione, 29/10/2026). Dal 31/10/2026
// (scelta di Matteo) è divisa per argomenti e sottoargomenti invece che per compito: una scheda per argomento, con i
// sottoargomenti su una griglia a più colonne che prende tutta la larghezza, e un indice fisso a sinistra che apre i
// sottoargomenti dell'argomento che si sta leggendo. La struttura (ancore e titoli) sta in stato/guida.ts: l'icona della
// guida di ogni scheda delle altre tab apre il sottoargomento che la spiega e lo segnala per un istante. Qui stanno anche
// fonti e licenze e l'avvertenza, che prima erano nel piè di pagina di ogni tab. Una regola si dice una volta sola.

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'

import type { Banda, InfoInquinante } from '../api/client'
import { numero } from '../lib/formato'
import { coloreBanda, ETICHETTA_BANDA, ETICHETTA_QUADRO, QUADRI, type Quadro } from '../lib/salubrita'
import { useDisponibilita } from '../stato/dati'
import { ARGOMENTI, argomentoDi, SEZIONI_GUIDA, titoloSezione, type Argomento, type SezioneGuida } from '../stato/guida'
import { Avvertenza, BadgeModellato, BadgeSimulato, Card, PallinoBanda, SegnoLimite, Valore } from './comuni'
import { IconaAria, IconaCalore, IconaGuida, IconaMarchio, IconaSalute } from './Icone'

function Voce({ termine, children }: { termine: ReactNode; children: ReactNode }) {
  return (
    <>
      <dt>{termine}</dt>
      <dd>{children}</dd>
    </>
  )
}

/** Un sottoargomento, con l'ancora per l'indice e per l'icona della guida. `largo` prende tutta la riga (tabelle). */
function Sotto({ id, largo = false, arrivo, children }: { id: SezioneGuida; largo?: boolean; arrivo: SezioneGuida | null; children: ReactNode }) {
  return (
    <section id={`info-${id}`} className={`info-sezione${largo ? ' info-sezione-larga' : ''}`} aria-labelledby={`info-${id}-titolo`}
             data-arrivo={arrivo === id || undefined}>
      <h3 id={`info-${id}-titolo`} className="info-titolo">{titoloSezione(id)}</h3>
      {children}
    </section>
  )
}

/** Un argomento: una scheda col titolo dall'indice e i sottoargomenti in griglia. */
function Tema({ argomento, icona, sottotitolo, children }: { argomento: Argomento['id']; icona?: ReactNode; sottotitolo: ReactNode; children: ReactNode }) {
  const a = ARGOMENTI.find((x) => x.id === argomento)!
  return (
    <section id={`info-arg-${a.id}`} className="info-argomento" aria-label={a.titolo}>
      <Card titolo={a.titolo} icona={icona} sottotitolo={sottotitolo}>
        <div className="info-griglia">{children}</div>
      </Card>
    </section>
  )
}

/** Le cinque classi di una rampa di colore della mappa (variabili di tema.css), da chiaro a scuro. */
function Rampa({ prefisso, da, a }: { prefisso: string; da: string; a: string }) {
  return (
    <span className="legenda-scala legenda-scala-info">
      <span className="legenda-estremo">{da}</span>
      {[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ background: `var(--${prefisso}-${i})` }} />)}
      <span className="legenda-estremo">{a}</span>
    </span>
  )
}

const STAT_BREVE: Record<string, string> = {
  media_annua: 'annua', media_24h: '24h', massimo_orario: 'orario', massimo_8h: '8h',
  peak_season: 'peak season', media_10min: '10 min',
}

/** Verde urbano ISTAT (609_1_DF_DCCV_URBANENV_18, edizione 2024) dei tre capoluoghi, con la chioma CLMS dell'anagrafica
 *  (`copertura_arborea_pct`) accanto. Dato annuale e quasi statico, letto da esploradati il 18/10/2026: non cambia a ogni
 *  caricamento, quindi sta qui e non in un endpoint. Si aggiorna a mano quando ISTAT pubblica un'edizione nuova. */
const VERDE_ISTAT = [
  { comune: 'Lecce', verde: 0.4, protette: 12.7, totale: 13.2, parchi: 0.8, chioma: 9.64 },
  { comune: 'Brindisi', verde: 0.3, protette: 10.6, totale: 10.9, parchi: 2.5, chioma: 5.0 },
  { comune: 'Taranto', verde: 1.5, protette: 8.5, totale: 10.0, parchi: 0.5, chioma: 4.48 },
]

/** Pill statica di una banda (per la legenda). */
function PillBanda({ banda }: { banda: Banda }) {
  if (banda === 'non_confrontabile') return <span className="banda-nc">non confrontabile</span>
  return <span className="pill-banda" style={{ ['--b' as string]: coloreBanda(banda) }}>{ETICHETTA_BANDA[banda]}</span>
}

/** I limiti di un quadro normativo per un inquinante, uno per riga: "statistica valore (superamenti)". */
function CellaQuadro({ inq, quadro }: { inq: InfoInquinante; quadro: Quadro }) {
  const lista = inq.riferimenti?.[quadro] ?? []
  if (!lista.length) return <span className="banda-nc">—</span>
  return (
    <ul className="limiti-quadro">
      {lista.map((r, k) => (
        <li key={k} title={r.nota ?? undefined}>
          <span className="limite-stat">{STAT_BREVE[r.statistica] ?? r.statistica}</span>{' '}
          {r.valore != null ? numero(r.valore) : '—'}
          {r.superamenti_ammessi != null && <small> ({r.superamenti_ammessi}/a)</small>}
        </li>
      ))}
    </ul>
  )
}

const vaiA = (ancora: string, comportamento: ScrollBehavior = 'smooth') =>
  document.getElementById(`info-${ancora}`)?.scrollIntoView({ behavior: comportamento, block: 'start' })

export default function Informazioni({ inquinanti, sezione }: { inquinanti: InfoInquinante[]; sezione: SezioneGuida | null }) {
  const disp = useDisponibilita().data
  const sim = disp?.simulati
  const riferimento = inquinanti.filter((i) => i.riferimento)
  const [attiva, setAttiva] = useState<SezioneGuida>(sezione ?? SEZIONI_GUIDA[0])
  // il sottoargomento chiesto dall'icona della guida: segnalato per un istante, così l'occhio lo trova nella griglia
  const [arrivo, setArrivo] = useState<SezioneGuida | null>(null)
  const argomentoAttivo = argomentoDi(attiva).id
  // dopo un salto chiesto (icona della guida, indice) l'indice resta sulla voce chiesta finché la pagina si assesta:
  // altrimenti vincerebbe il vicino a sinistra nella stessa riga della griglia
  const fermoFino = useRef(0)
  const fissa = (id: SezioneGuida) => { fermoFino.current = performance.now() + 1200; setAttiva(id) }

  // aperta dall'icona della guida: subito sul sottoargomento chiesto, e di nuovo quando arriva il carattere (aperta da
  // un indirizzo, il testo sopra si accorcia col carattere vero e il sottoargomento finiva sopra la vista)
  useEffect(() => {
    if (!sezione) return
    fissa(sezione)
    vaiA(sezione, 'instant')
    setArrivo(sezione)
    let annullato = false
    document.fonts.ready.then(() => { if (!annullato) vaiA(sezione, 'instant') })
    const spegni = window.setTimeout(() => setArrivo(null), 1800)
    return () => { annullato = true; window.clearTimeout(spegni) }
  }, [sezione])

  // l'indice segue la lettura: il sottoargomento più in alto (e più a sinistra, nella stessa riga della griglia) fra
  // quelli che entrano nel terzo superiore della finestra
  useEffect(() => {
    const osservatore = new IntersectionObserver((voci) => {
      if (performance.now() < fermoFino.current) return
      const visibili = voci.filter((v) => v.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left)
      if (visibili[0]) setAttiva(visibili[0].target.id.slice('info-'.length) as SezioneGuida)
    }, { rootMargin: '0px 0px -66% 0px' })
    SEZIONI_GUIDA.forEach((id) => { const el = document.getElementById(`info-${id}`); if (el) osservatore.observe(el) })
    return () => osservatore.disconnect()
  }, [])

  const scegli = (e: MouseEvent, id: SezioneGuida) => {
    e.preventDefault()
    fissa(id)
    vaiA(id)
    window.history.replaceState(null, '', `#info/${id}`)
  }
  const scegliArgomento = (e: MouseEvent, a: Argomento) => {
    e.preventDefault()
    fissa(a.sotto[0][0])
    vaiA(`arg-${a.id}`)
    window.history.replaceState(null, '', `#info/${a.sotto[0][0]}`)
  }

  return (
    <div className="informazioni">
      <nav className="info-indice" aria-label="Indice di Informazioni">
        <ul>
          {ARGOMENTI.map((a) => {
            const aperto = a.id === argomentoAttivo
            return (
              <li key={a.id} className={aperto ? 'info-indice-aperto' : undefined}>
                <a href={`#info/${a.sotto[0][0]}`} className="info-indice-argomento" aria-current={aperto ? 'true' : undefined}
                   onClick={(e) => scegliArgomento(e, a)}>{a.titolo}</a>
                {aperto && (
                  <ul>
                    {a.sotto.map(([id, titolo]) => (
                      <li key={id}>
                        <a href={`#info/${id}`} aria-current={attiva === id ? 'location' : undefined} onClick={(e) => scegli(e, id)}>{titolo}</a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="info-testo">
        <Card className="info-intro" titolo="Aria, calore e salute nel Salento">
          <p>
            Supporto alle decisioni per presidi medici e aziende sanitarie, pubbliche e private, sui 20 distretti socio-sanitari di
            Lecce, Brindisi e Taranto: mette accanto, per zona e nel tempo, qualità dell'aria, calore urbano e salute, usando solo
            dati pubblici. Ogni scheda della dashboard rimanda qui con l'icona <span className="senza-a-capo">della guida <span className="info-icona-guida"><IconaGuida dim={18} /></span>,</span> che
            apre l'argomento che la spiega.
          </p>
          {disp && <Avvertenza testo={disp.avvertenza} />}
        </Card>

        <Tema argomento="segni" sottotitolo="Ogni valore dice da dove viene e perché manca: un segno, e il perché passandoci sopra">
          <Sotto id="segni" arrivo={arrivo}>
            <dl className="legenda-voci">
              <Voce termine={<Valore valore={12.3} stato="VALORE" />}>valore valido; passandoci sopra, da quanti giorni, stazioni o comuni viene.</Voce>
              <Voce termine={<Valore valore={null} stato="NO_DATA" />}>non disponibile: la fonte <strong>non copre</strong> la zona o il periodo (nessuna stazione, inquinante non misurato, periodo fuori copertura, dato non integrato o non pubblicabile).</Voce>
              <Voce termine={<Valore valore={null} stato="NULL" />}>la fonte <strong>copre</strong> la zona ma il valore non è utilizzabile (nullo, non valido, errore della fonte).</Voce>
              <Voce termine={<PallinoBanda banda="scadente" />}>banda di <strong>salubrità</strong>: la parola (qui «scadente») compare passandoci sopra, i colori sono in «Limiti di legge e salubrità».</Voce>
            </dl>
          </Sotto>
          <Sotto id="segni-origine" arrivo={arrivo}>
            <dl className="legenda-voci">
              <Voce termine={<BadgeModellato />}>dato <strong>modellato</strong>, non misurato: Copernicus CAMS per l'aria (griglia di circa 10 km), ERA5-Land per la temperatura (circa 9 km).</Voce>
              <Voce termine={<BadgeSimulato />}>dato <strong>simulato, non reale</strong>: ricoveri, pronto soccorso e ADI, che nessuna fonte pubblica dà a questa grana; mai da usare per decisioni. Passandoci sopra, la dicitura completa.</Voce>
              <Voce termine={<sup className="statistica">max</sup>}><strong>massimo giornaliero</strong>, non media delle ore (ARPA per NO2, O3, SO2 e CO): non si confronta con una media.</Voce>
              <Voce termine="~">valore <strong>derivato</strong> per la lettura: un totale mensile diviso per i giorni del mese (es. ~5,2 decessi/giorno). Non entra in nessun calcolo.</Voce>
            </dl>
          </Sotto>
        </Tema>

        <Tema argomento="pagina" sottotitolo="Il periodo e l'inquinante valgono per tutta la pagina; la barra laterale porta alle tab">
          <Sotto id="finestra" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>La <strong>testata</strong> sceglie per tutta la pagina il periodo e l'inquinante. Il periodo è una <strong>finestra</strong> di al più un mese, letta da carta, scheda della zona, numeri, classifica e Riepilogo (non da Alberi e Suolo, che sono statici).</li>
              <li>La pagina si apre sull'<strong>ultimo mese coperto da tutti i dati</strong>, perché decessi e temperatura arrivano in ritardo. <strong>Vai agli ultimi giorni</strong> porta all'aria più recente e da lì un pulsante riporta al mese completo.</li>
              <li>La finestra si sposta di una finestra con le frecce ai lati delle date, di un giorno con le frecce della tastiera sull'asse, trascinando sull'asse o dal calendario che si apre sulle date. Scegliere un inquinante riporta la carta sulla vista Aria. L'asse va dal 2024 con anni, mesi e settimane; i tratti vuoti sono giorni senza aria.</li>
              <li>Scorrendo, l'asse si nasconde e resta la riga dei controlli. La riga è sempre una sola: sugli schermi stretti i controlli si fanno più piccoli, la fonte dell'aria passa in un menu, poi spariscono le frecce della finestra; gli inquinanti che non entrano passano nel menu «altri…». Il periodo e il numero dei suoi giorni sono anche nel tooltip delle date.</li>
              <li>In <strong>Stagionalità</strong> la testata è la stessa, ma al posto dell'inquinante porta i filtri della tab: zona, fonte dell'aria (dopo l'icona dell'aria), scenario e «nella sintesi» dei simulati (dopo la beuta). La finestra lì non cambia i numeri, che sono medie su tutto l'archivio.</li>
            </ul>
          </Sotto>
          <Sotto id="domini" arrivo={arrivo}>
            <p className="info-paragrafo">
              Il pulsante dei <strong>domini nella finestra</strong>, l'icona degli strati accanto alle date, dice nel tooltip quanti domini hanno dati nel periodo; un
              pallino sull'icona segnala che qualche dominio manca o è nascosto, e l'icona gira mentre i dati arrivano: intanto la pagina resta usabile,
              con i dati precedenti. Aperta, mostra la copertura di ogni dominio, gli interruttori per nascondere ricoveri (il blocco in fondo a Stagionalità) e dati
              simulati e lo <strong>scenario</strong> dei simulati, che vale per tutta la pagina.
            </p>
          </Sotto>
          <Sotto id="barra" arrivo={arrivo}>
            <p className="info-paragrafo">
              La <strong>barra laterale</strong> porta alle tab (Mappa, Stagionalità, Fonti a confronto, Riepilogo, Informazioni), elenca le zone a confronto e in fondo dice fin dove
              arrivano i dati di ogni dominio. Chiusa resta a icone, con le zone come pallini colorati; la scelta si ricorda.
            </p>
          </Sotto>
        </Tema>

        <Tema argomento="carta" sottotitolo="Dove agire: la carta dei 20 distretti e dei 145 comuni, con la scheda della zona appoggiata a sinistra">
          <Sotto id="carta" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li><strong>Clic</strong> su una zona: la porta nella scheda appoggiata a sinistra. Il <strong>doppio clic</strong> la mette fra le zone a confronto (fino a 4) e la toglie. Da tastiera si usano la scheda, la classifica e il Riepilogo.</li>
              <li>In testa alla carta c'è la <strong>fonte</strong>: nella vista Aria si sceglie (una fonte alla volta oppure «Tutte»), nelle altre viste è scritta. Stazioni e nomi dei comuni si accendono nel riquadro «Mostra», in basso a destra.</li>
            </ul>
          </Sotto>
          <Sotto id="scheda" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>L'<strong>occhio</strong> la chiude e la riapre; accanto si sceglie il <strong>livello</strong>, distretti o comuni. <strong>Aggiungi al confronto</strong>, sotto il nome, mette la zona fra quelle a confronto e la toglie, come il doppio clic sulla carta.</li>
              <li>Le sei <strong>particelle</strong> sul bordo destro scelgono il colore della carta e cosa mostra la scheda: Aria e Salubrità l'aria, Temperatura, Alberi e Suolo il calore, Salute la salute. Accanto a ognuna, il dato della zona.</li>
              <li><strong>Aria</strong>: una riga per inquinante con un solo giudizio, quello del D.Lgs. 155/2010 in vigore; OMS 2021 e UE 2024/2881 compaiono solo se più severi.</li>
              <li><strong>Calore</strong>: ERA5-Land <BadgeModellato dim={15} /> e ARPA meteo (solo comuni con una stazione), mai mediate fra loro; sotto, chioma e suolo sigillato.</li>
              <li><strong>Salute</strong>: decessi solo per distretto e mese, sommati sui mesi toccati dalla finestra (per un comune N/D); ricoveri = dimissioni annuali della provincia, solo informative; poi i simulati.</li>
            </ul>
          </Sotto>
          <Sotto id="ricerca" arrivo={arrivo}>
            <p className="info-paragrafo">
              <strong>Cerca</strong>, in alto a destra accanto allo zoom: scrivi il nome di un distretto o di un comune (anche senza accenti; per un distretto basta il
              numero, es. «51»). Scegliendo un risultato la zona va nella scheda, il livello passa a distretti o comuni e la carta scorre solo se la zona non si vede; la
              zona non entra nel confronto. Frecce e Invio per scegliere, Esc per chiudere.
            </p>
          </Sotto>
          <Sotto id="colori" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li><strong>Colori.</strong> Aria, Temperatura e Salute: cinque classi a intervalli uguali fra minimo e massimo della finestra, che dicono quale zona è più alta delle altre, <strong>non</strong> se supera un limite. Salubrità: bande rispetto ai limiti di legge. Alberi e Suolo: dati statici, fra minimo e massimo delle zone.</li>
              <li><strong>Vuoti.</strong> Grigio pieno = null; contorno puntinato = N/D; <strong>tratteggio</strong> = zona senza stazioni fisiche (124 comuni su 145, 8 distretti su 20: 53, 54, 56, 58, 59 e 60 di Lecce, 1 e 7 di Taranto), dove l'unica aria è CAMS <BadgeModellato dim={15} />. Non dipende dal periodo.</li>
            </ul>
          </Sotto>
          <Sotto id="aggregazione" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li><strong>Distretto</strong> = media pesata sui residenti dei comuni con valore (Alberi e Suolo: sulla superficie). <strong>Comune</strong> = media delle sue stazioni fisiche.</li>
              <li>Il confronto fra aria, salute e calore si fa a <strong>distretto × mese</strong>, la grana comune ai tre domini e consentita dalla privacy: per questo i decessi si sommano sui mesi toccati dalla finestra.</li>
            </ul>
          </Sotto>
        </Tema>

        <Tema argomento="grafici" sottotitolo="Sotto la carta e nel Riepilogo: i numeri della finestra, zona per zona">
          <Sotto id="numeri" arrivo={arrivo}>
            <p className="info-paragrafo">
              Sotto la carta, una scheda divisa per dominio. <strong>Aria</strong>: il valore più alto dell'inquinante nella finestra (col suo distretto), quanti
              distretti hanno una misura e, sotto, la classifica delle zone. <strong>Salute</strong> del Salento: i decessi dei mesi toccati, i ricoveri respiratori
              dell'ultimo anno pubblicato e gli accessi in PS simulati. La <strong>freccia</strong> in fondo alla scheda apre sotto ogni numero la sua nota (zona,
              copertura, variazione); chiusa, il motivo di un N/D resta nel tooltip del segno.
            </p>
            <p className="info-paragrafo">
              <strong>Classifica</strong>: di default solo le zone a confronto del livello della carta, ciascuna col suo <strong>posto in classifica</strong> fra tutte (– = senza valore). «Tutti i
              20 distretti» (o i comuni) apre l'elenco intero in ordine di valore, con le zone a confronto nel loro colore e quelle senza valore riassunte in una riga in
              fondo. La lunghezza delle barre è sempre sul massimo di tutte le zone. Clic su una barra: la zona entra nel confronto e in primo piano; su una zona già a
              confronto la porta in primo piano, un secondo clic la toglie.
            </p>
          </Sotto>
          <Sotto id="giorno" arrivo={arrivo}>
            <p className="info-paragrafo">Il mese in cui finisce la finestra, per le zone a confronto e la fonte scelta; i buchi sono giorni senza valore.</p>
          </Sotto>
          <Sotto id="domini-mese" arrivo={arrivo}>
            <p className="info-paragrafo">
              Grafici impilati con lo stesso asse dei mesi, solo per i distretti, perché i decessi esistono solo per distretto: l'inquinante, la{' '}
              <strong>temperatura</strong> ERA5-Land <BadgeModellato dim={15} /> (media del mese della massima, media o minima giornaliera, a scelta sopra il grafico),
              i decessi e i dati simulati. I ricoveri (dimissioni ISTAT, annuali e
              provinciali) sono l'ultimo blocco di Stagionalità. Nei simulati, <strong>Sovrapponi gli scenari</strong> disegna lo scenario scelto a linea piena e l'altro tratteggiato: la
              distanza è l'effetto di aria e caldo <strong>imposto da noi</strong>, più il caso, che nei comuni piccoli pesa molto.
            </p>
          </Sotto>
          <Sotto id="riepilogo" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>Una riga per distretto con tutti i dati della finestra, a gruppi di colonne: territorio, aria della fonte scelta in testa alla tabella, salubrità, salute, calore. In fondo la <strong>Δ</strong> dell'inquinante rispetto alla finestra precedente della stessa ampiezza. Clic su una riga (o sul nome, da tastiera): aggiungi o togli dal confronto; clic su un'intestazione: ordina. La colonna dei distretti resta ferma mentre la tabella scorre; il bordo destro sfumato dice che ci sono altre colonne.</li>
              <li>Aria = media della finestra; salubrità = peggiore inquinante su <strong>tutte le fonti</strong>, non solo quella scelta (nei distretti senza stazioni dal solo CAMS <BadgeModellato dim={15} />); decessi = somma dei mesi toccati, tutte le cause, dati provvisori, con il ~/giorno; ricoveri = dimissioni annuali della <strong>provincia</strong>, uguali per i distretti della stessa provincia, solo informative; salute simulata per 100.000 residenti al giorno (distretto = somma dei comuni, ADI in quota degli accessi).</li>
              <li>Il primo calcolo di un mese può richiedere qualche decina di secondi.</li>
            </ul>
          </Sotto>
        </Tema>

        <Tema argomento="stagionalita" sottotitolo="Quando agire: i mesi critici dell'anno per il Salento o un distretto, su tutto l'archivio">
          <Sotto id="stagionalita" arrivo={arrivo}>
            <p className="info-paragrafo">
              Tutto l'archivio, per il Salento o un distretto, con zona e fonte scelte nella testata: la finestra della barra temporale non cambia i numeri. Ordine dei
              blocchi: il consiglio, i periodi critici, cosa sta cambiando, i 12 mesi a confronto col mese anno per anno, l'anno su anno e, in fondo, i ricoveri. Il mese dell'anno è la media dei mesi completi negli
              <strong> anni comuni a tutti i domini, dal 2024</strong>; il mese in corso è escluso. Gli anni precedenti restano nel dettaglio anno per anno e nel grafico
              anno su anno, in grigio e fuori da medie e ranghi.
            </p>
          </Sotto>
          <Sotto id="consiglio" arrivo={arrivo}>
            <p className="info-paragrafo">
              In cima, è il sommario della pagina: il periodo da preparare per primo e cinque punti, <strong>Quando</strong>, <strong>Perché</strong>, <strong>Cosa
              preparare</strong>, <strong>Sta cambiando</strong>, <strong>Da tenere d'occhio</strong>. Ogni etichetta porta al blocco che spiega il punto; un mese
              sottolineato apre il suo dettaglio anno per anno. Spunti da valutare, non prescrizioni: il testo esteso di ogni spunto è nel tooltip.
            </p>
          </Sotto>
          <Sotto id="periodi" arrivo={arrivo}>
            <p className="info-paragrafo">
              Un mese è <strong>critico</strong> per un tema se è fra i suoi <strong>3 mesi peggiori</strong> (a pari merito entrano tutti). Sei temi, un indicatore
              ciascuno e senza pesi: aria complessiva, temperatura massima, decessi, accessi in PS, accessi in PS degli assistiti ADI, ricoveri respiratori (gli ultimi
              tre simulati: «nella sintesi» li toglie dal conteggio). I mesi vicini critici per almeno due temi formano un <strong>periodo</strong>, e dicembre è vicino a
              gennaio: alto se critico per almeno metà dei temi, medio per due o più, basso per uno. Il <strong>mese peggiore</strong> dell'anno è quello col maggior
              numero di temi critici nel primo periodo.
            </p>
            <p className="info-paragrafo">
              Per ogni periodo, i temi critici con il mese peggiore, lo <strong>scarto dalla media dei 12 mesi</strong> (in °C per la temperatura) e il rango; il valore
              assoluto è nel tooltip. Il dettaglio (inquinanti, PS per causa, ricoveri circolatori, ADI a bassa urgenza e ritorni) si apre a richiesta e non conta fra i temi.
            </p>
          </Sotto>
          <Sotto id="rango" arrivo={arrivo}>
            <p className="info-paragrafo">
              Da <strong>1 (mese peggiore)</strong> a 12 (migliore), in tutta la tab e nel CSV; a pari merito il rango medio. Peggiore = valore più alto: concentrazione,
              temperatura massima, eventi al giorno. Aria complessiva = media dei ranghi dei 5 inquinanti, riordinata da 1 a 12.
            </p>
          </Sotto>
          <Sotto id="mesi" arrivo={arrivo}>
            <p className="info-paragrafo">
              Tre righe di sintesi: <strong>Aria</strong> (rango medio dei 5 inquinanti), <strong>Calore</strong> (temperatura massima) e <strong>Salute</strong>
              (decessi, reali). La punta accanto ad Aria apre i 5 inquinanti, quella accanto a Salute i simulati (PS, assistiti ADI, ricoveri respiratori): si aprono
              insieme qui e nel mese anno per anno, sotto nello stesso blocco. I simulati non entrano mai in un numero di sintesi. Il riempimento va dal mese migliore (quasi
              bianco) al peggiore (pieno) nel colore del dominio: blu petrolio l'aria, mattone la temperatura, vinaccia la salute. Il <strong>contorno d'inchiostro</strong>
              segna i mesi critici; l'ultima riga conta i temi critici di ogni mese. Inquinanti, PS per causa, ricoveri circolatori, ADI a bassa urgenza e ritorni entro 30
              giorni compaiono nei periodi come dettaglio e non cambiano il conteggio.
            </p>
            <dl className="legenda-voci">
              <Voce termine={<span className="campione-limite" aria-hidden="true"><SegnoLimite /></span>}><strong>Limite di legge</strong>: in quel mese, in almeno un anno, un limite del <strong>D.Lgs. 155/2010</strong> è stato toccato, a parità di statistica (per il Salento in almeno un distretto). Basta un giorno: non è per forza una violazione, che dipende dai superamenti ammessi (nel tooltip). Per O3, e per CO senza ARPA, non c'è un limite confrontabile con una media giornaliera.</Voce>
            </dl>
          </Sotto>
          <Sotto id="dettaglio-mese" arrivo={arrivo}>
            <p className="info-paragrafo">
              Sotto la tabella dei 12 mesi, nello stesso blocco: si apre sul <strong>mese peggiore dell'intero anno</strong> (il picco del primo periodo critico), non sul
              mese della finestra della testata, e lo dice; cambia con un clic su un mese della tabella o su un mese sottolineato nel consiglio. Stesse tre sintesi, gli anni in colonna (media e rango del mese stanno nella tabella sopra). L'aria non ha un rango per un anno solo: la sua riga
              dice quali inquinanti salgono, scendono o restano stabili. La <strong>Δ</strong> è l'ultimo anno completo sulla media dei precedenti, con la stessa regola di
              «Cosa sta cambiando»; un numero sbiadito è un mese ancora incompleto. Gli anni prima del 2024 sono in grigio, fuori da medie e ranghi.
            </p>
          </Sotto>
          <Sotto id="anno-su-anno" arrivo={arrivo}>
            <p className="info-paragrafo">
              Una linea per anno dell'indicatore scelto; le <strong>fasce grigie</strong> sono i periodi critici, numerati come sopra. Serve a vedere se il periodo critico
              torna ogni anno (stagionale, quindi da pianificare) o se un anno si stacca (un'anomalia). Sopra il grafico, il mese peggiore di ogni anno del confronto e
              quante volte cade in un periodo critico.
            </p>
          </Sotto>
          <Sotto id="cambiamenti" arrivo={arrivo}>
            <p className="info-paragrafo">
              L'ultimo mese completo di ogni indicatore contro la media dello stesso mese negli anni precedenti, come barra da zero: a destra più alto del solito, a
              sinistra più basso. Dentro la <strong>fascia grigia</strong> (±10%, ±1 °C per la temperatura, che ha la sua scala) è stabile; fuori, la barra è piena ed è un
              cambiamento da riportare nel piano della stagione dopo. Con un solo anno di storico è indicativo. Sotto, i domini indietro di più del mese in corso, col motivo.
            </p>
          </Sotto>
        </Tema>

        <Tema argomento="aria" icona={<IconaAria />} sottotitolo="Quattro fonti pubbliche: ARPA Puglia, OpenAQ, EEA e il modello Copernicus CAMS">
          <Sotto id="aria-tutte" arrivo={arrivo}>
            <p className="info-paragrafo">
              Per comune e giorno, media delle sole fonti concordi (entro 3 µg/m³, 0,1 mg/m³ per il CO, o il 20% della mediana); la fonte che si discosta è scartata e il
              riquadro al passaggio lo dice. ARPA entra solo per PM10 e PM2.5, perché per gli altri pubblica il massimo; senza stazioni resta CAMS. È l'unica media fra
              fonti, una lettura di sintesi: non entra nella salubrità né in Fonti a confronto.
            </p>
          </Sotto>
          <Sotto id="aria-confronto" arrivo={arrivo}>
            <p className="info-paragrafo">
              Per la zona in primo piano, nel mese in cui finisce la finestra: il gruppo di validazione (OpenAQ, EEA, CAMS: stessa statistica, concordanza in percentuale)
              e, a parte, ARPA, il cui massimo giornaliero si legge solo qualitativamente.
            </p>
            <dl className="legenda-voci legenda-voci-sinistra">
              <Voce termine="Validazione">stessa statistica, stazione e giorno.</Voce>
              <Voce termine="Qualità del modello">CAMS contro la media delle stazioni del comune.</Voce>
              <Voce termine="Qualitativa">statistiche diverse, senza percentuale.</Voce>
            </dl>
          </Sotto>
          <Sotto id="limiti" largo arrivo={arrivo}>
            <div className="info-colonne">
              <p className="info-paragrafo">
                Un valore si confronta con un limite solo se è <strong>della stessa statistica</strong>: il massimo giornaliero (ARPA <sup className="statistica">max</sup>) con
                un limite orario o su 8 ore, una media giornaliera con il limite su 24 ore o, solo come indicativo, con la media annua. Altrimenti la cella dice
                <strong> non confrontabile</strong>: l'ozono lo è quasi sempre, perché i suoi limiti sono sul massimo su 8 ore e sulla peak season.
              </p>
              <div className="info-paragrafo">
                <p className="legenda-bande">
                  <PillBanda banda="buona" /> <PillBanda banda="accettabile" /> <PillBanda banda="scadente" /> <PillBanda banda="cattiva" /> <PillBanda banda="non_confrontabile" />
                </p>
                La banda di un inquinante segue il <strong>D.Lgs. 155/2010</strong> in vigore; quella della zona è il peggiore inquinante, come nell'indice europeo
                EAQI, senza pesi. La vista Salubrità della carta usa questi colori.
              </div>
            </div>
            <div className="tabella-scorre">
              <table className="tabella tabella-informazioni tabella-riferimenti">
                <thead>
                  <tr>
                    <th scope="col">Inquinante</th>
                    {QUADRI.map((q) => (
                      <th key={q} scope="col">{ETICHETTA_QUADRO[q]}{q === 'ue_2024_2881' && <small> (2030)</small>}{q === 'oms_2021' && <small> (linee guida)</small>}</th>
                    ))}
                    <th scope="col" className="num">Soglia di allarme</th>
                  </tr>
                </thead>
                <tbody>
                  {riferimento.map((i) => (
                    <tr key={i.id}>
                      <th scope="row" title={i.descrizione ?? undefined}>{i.id} <small className="sigla">{i.unita}</small></th>
                      {QUADRI.map((q) => <td key={q}><CellaQuadro inq={i} quadro={q} /></td>)}
                      <td className="num">{i.soglia_allarme != null ? numero(i.soglia_allarme) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nota-grafico">Limiti in µg/m³ (CO in mg/m³); «(n/a)» = superamenti ammessi per anno civile. Fonti: D.Lgs. 155/2010, linee guida OMS 2021, direttiva (UE) 2024/2881.</p>
          </Sotto>
        </Tema>

        <Tema argomento="calore" icona={<IconaCalore />} sottotitolo="Esposizione al calore e fattori di mitigazione, mostrati accanto e mai combinati in un punteggio">
          <Sotto id="calore" arrivo={arrivo}>
            <dl className="legenda-voci legenda-voci-impilata">
              <Voce termine={<Rampa prefisso="calore" da="fresco" a="caldo" />}><strong>Temperatura</strong> media dell'aria a 2 m nella finestra, ERA5-Land <BadgeModellato dim={15} />: vale per tutti i comuni ma è una rianalisi a circa 9 km, non una misura.</Voce>
            </dl>
            <p className="info-paragrafo">Nella scheda della zona, accanto, le stazioni ARPA meteo dei soli comuni che ne hanno una: le due fonti non si mediano mai.</p>
          </Sotto>
          <Sotto id="mitigazione" arrivo={arrivo}>
            <dl className="legenda-voci legenda-voci-impilata">
              <Voce termine={<Rampa prefisso="alberi" da="meno" a="più chioma" />}><strong>Alberi</strong>: % di chioma arborea sul comune (Copernicus Tree Cover Density 2024, 10 m), uliveti e frutteti compresi. Rinfresca soprattutto di giorno.</Voce>
              <Voce termine={<Rampa prefisso="suolo" da="meno" a="più sigillato" />}><strong>Suolo</strong>: % di suolo impermeabile, asfalto ed edifici (Copernicus Imperviousness Density 2018, l'ultima edizione, 10 m). Trattiene il calore, soprattutto di notte.</Voce>
            </dl>
            <p className="info-paragrafo">
              Alberi e Suolo sono <strong>statici</strong> e sono medie sull'<strong>intero comune</strong>, campagna compresa: Lecce, grande e con molta campagna, ha il 7% di suolo
              sigillato, Aradeo, piccolo e compatto, il 15%. Il distretto è la media pesata sulla superficie. Le due edizioni sono diverse (2024 e 2018): descrivono il territorio,
              non si confrontano nel tempo. Non si combinano mai con la temperatura in un punteggio.
            </p>
          </Sotto>
          <Sotto id="calore-confronto" arrivo={arrivo}>
            <p className="info-paragrafo">
              Per la zona in primo piano, nel mese della finestra (media, massima o minima): ERA5-Land, modello, tratteggiato, contro le stazioni ARPA meteo, sui soli
              comuni con una stazione, con i giorni oltre le soglie di caldo.
            </p>
          </Sotto>
          <Sotto id="verde" largo arrivo={arrivo}>
            <div className="tabella-scorre">
              <table className="tabella tabella-informazioni">
                <thead>
                  <tr>
                    <th scope="col">Capoluogo</th>
                    <th scope="col" className="num">Verde urbano <small>% del comune</small></th>
                    <th scope="col" className="num">Aree protette <small>% del comune</small></th>
                    <th scope="col" className="num">Verde + aree protette <small>% del comune</small></th>
                    <th scope="col" className="num">Parchi storici e urbani <small>per 100 m² edificati</small></th>
                    <th scope="col" className="num">Chioma CLMS <small>% del comune, 2024</small></th>
                  </tr>
                </thead>
                <tbody>
                  {VERDE_ISTAT.map((v) => (
                    <tr key={v.comune}>
                      <th scope="row">{v.comune}</th>
                      <td className="num">{numero(v.verde)}</td>
                      <td className="num">{numero(v.protette)}</td>
                      <td className="num">{numero(v.totale)}</td>
                      <td className="num">{numero(v.parchi)}</td>
                      <td className="num">{numero(v.chioma)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="nota-grafico">
              Solo per confronto: verde pubblico e aree protette dei tre capoluoghi (ISTAT, Ambiente urbano, edizione 2024; «verde + aree protette» al netto delle
              sovrapposizioni). Sono grandezze diverse dalla chioma CLMS, che conta tutti gli alberi: i numeri non devono coincidere, conta se l'ordine fra i capoluoghi è
              lo stesso. Non entra in carta, scheda o Riepilogo.
            </p>
          </Sotto>
        </Tema>

        <Tema argomento="salute" icona={<IconaSalute />} sottotitolo="Decessi reali ISTAT per distretto e mese; ricoveri, pronto soccorso e ADI simulati finché non arrivano i dati reali">
          <Sotto id="decessi" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li><strong>Decessi</strong> ISTAT, tutte le cause, dati provvisori negli ultimi mesi: solo per distretto e mese, sommati sui mesi toccati dalla finestra; per un comune N/D (privacy).</li>
              <li><strong>Ricoveri</strong> = dimissioni annuali della <strong>provincia</strong> (ISTAT Health for All), uguali per i distretti della stessa provincia, solo informative: nella scheda della zona, nella Sintesi della finestra e nell'ultimo blocco di Stagionalità.</li>
            </ul>
          </Sotto>
          <Sotto id="vista-salute" arrivo={arrivo}>
            <p className="info-paragrafo">
              Eventi per 100.000 residenti al giorno, cioè decessi ISTAT (reali, sui mesi toccati dalla finestra) più ricoveri respiratori e circolatori e accessi in PS
              (simulati <BadgeSimulato dim={15} />), senza pesi. I comuni hanno il valore del loro distretto (privacy). Pesano soprattutto gli accessi in PS: è una lettura
              esplorativa, non un indice di rischio.
            </p>
          </Sotto>
          <Sotto id="decessi-confronto" arrivo={arrivo}>
            <p className="info-paragrafo">
              Nell'anno della finestra e per distretto: la somma dei decessi giornalieri ISTAT contro il bilancio demografico mensile ISTAT (anagrafe, fino al 2024: un
              piccolo scarto è atteso) e contro Eurostat per provincia e mese (ogni settimana nel mese del suo giovedì). Eurostat ridistribuisce i dati ISTAT: verifica la
              somma, non la fonte, e gli scarti recenti sono revisioni dei dati provvisori. Dimissioni ospedaliere e dati simulati hanno una sola fonte: non c'è nulla da confrontare.
            </p>
          </Sotto>
          <Sotto id="simulati" arrivo={arrivo}>
            <p className="avviso-simulato"><BadgeSimulato /> {sim?.dicitura ?? sim?.motivo ?? 'Dati simulati in caricamento…'}</p>
            <dl className="legenda-voci legenda-voci-sinistra">
              <Voce termine="Perché">i dati chiesti ad <strong>AReSS Puglia</strong> (via prof. Patrono) e a <strong>Parsec 3,26</strong> non sono arrivati e il progetto usa solo i dati che ha già;
                nessuna fonte pubblica dà ricoveri, pronto soccorso o ADI sotto la provincia e sotto l'anno. I simulati hanno la forma dei dati reali (comune × giorno) e servono a costruire e collaudare la piattaforma.</Voce>
              <Voce termine="Cosa">ricoveri respiratori e circolatori; accessi in PS (totali, respiratori, cardiovascolari); accessi in PS degli assistiti in ADI, con la quota a bassa urgenza e i ritorni
                entro 30 giorni. {sim?.da && sim?.a && <>Dal {sim.da} al {sim.a}, 145 comuni. </>}I decessi restano quelli reali, le malattie croniche non si simulano.</Voce>
              <Voce termine="Unità">per <strong>100.000 residenti al giorno</strong>, con il totale della finestra accanto; distretto e Salento sono la somma dei comuni.</Voce>
            </dl>
          </Sotto>
          <Sotto id="scenari" arrivo={arrivo}>
            <dl className="legenda-voci legenda-voci-sinistra">
              <Voce termine="Scenari"><strong>letteratura</strong> (predefinito, quello della tesi): PM10 sui ricoveri e PS respiratori e NO2 sui cardiovascolari (EpiAir2), caldo oltre 30 °C di
                temperatura massima (Michelozzi et al. 2009), con l'esposizione di CAMS ed ERA5-Land. <strong>nullo</strong>: solo popolazione, stagione e caso. Stesso seme: la differenza fra i due è l'effetto, non il caso.</Voce>
              <Voce termine="Calibrazione">ricoveri dalle dimissioni ISTAT Health for All per provincia (entro ±1,5%), PS da 311 accessi ogni 1.000 abitanti (Annuario SSN 2023), stagionalità dai
                decessi ISTAT 2011-2019, ADI da Campagna et al. 2021.</Voce>
              <Voce termine="Verifica">l'effetto del <strong>caldo</strong> si ritrova (circa +5% per °C oltre i 30); <strong>PM10 e NO2</strong> alla dimensione reale non si distinguono dal caso; la
                correlazione grezza fra temperatura massima e ricoveri resta negativa anche quando il caldo li aumenta, perché l'inverno porta più ricoveri. Ogni correlazione resta esplorativa.</Voce>
            </dl>
          </Sotto>
        </Tema>

        <Tema argomento="assistente" icona={<IconaMarchio dim={18} />} sottotitolo="Domande in italiano su una scheda, con risposte fatte solo dei dati e dei documenti del progetto">
          <Sotto id="assistente" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>L'assistente si chiama <strong>ONE</strong>. Il <strong>cuore</strong> <span className="info-icona-guida"><IconaMarchio dim={18} /></span>, subito a sinistra dell'icona della guida, apre la chat laterale di ONE sulla scheda.
                C'è su tutte le schede con dati: la <strong>carta</strong> (che risponde anche sulla zona in primo piano), la <strong>Sintesi della finestra</strong>,
                <strong>giorno per giorno</strong>, <strong>Aria e salute per distretto e mese</strong>, le tre schede di <strong>Fonti a confronto</strong>, il <strong>Riepilogo</strong> e,
                nella Stagionalità, <strong>Quando intervenire</strong>, <strong>anno su anno</strong>, <strong>mese anno per anno</strong>, <strong>Cosa sta cambiando</strong> e i
                <strong>Ricoveri</strong>; si spegne finché la scheda non ha dati.</li>
              <li>La chat sta ferma sulla <strong>destra della finestra</strong>, sempre intera: il resto della pagina si stringe a sinistra e scorre da solo.
                Si apre con un benvenuto e tre domande proposte (le altre scorrendo l'elenco); <strong>Nuova chat</strong> la svuota e <strong>Copia in Markdown</strong>
                copia domande, risposte e dati usati, pronti da incollare in un documento.</li>
              <li>Risponde su <strong>quella scheda</strong>, con le zone, il periodo, l'inquinante, la fonte o l'indicatore scelti. Se cambiano, la conversazione riparte e lo dice.</li>
              <li><strong>Cosa sto guardando?</strong>, o anche solo «descrizione», spiega la scheda in tre parti: cosa mostra, quali dati contiene, come si legge.
                «Chi sei?», «Cos'è ONE?» o «Cosa posso chiederti?» presentano ONE, con le domande principali.</li>
              <li>Due tipi di domanda: <strong>descrizioni</strong> (che cos'è un inquinante, come si legge un segno, da dove viene un dato), dai documenti scritti per
                ONE; <strong>analisi</strong>, calcolate dal codice della dashboard. Il modello non fa conti: scrive la frase con i numeri che riceve.</li>
              <li>Le analisi dipendono dalla scheda. <strong>Giorno per giorno</strong>: media, giorno peggiore, tendenza, giorni oltre un limite o una soglia scelta,
                relazione con la temperatura. <strong>Aria e salute</strong>: media e mese peggiore di aria, temperatura e decessi, distretto più alto, relazione
                dei decessi con l'aria o con il caldo mese per mese (da 12 mesi in su). <strong>Carta</strong>, <strong>Sintesi</strong> e <strong>Riepilogo</strong>:
                zone più alte e più basse, posto delle zone a confronto fra tutte, bande di salubrità, dati mancanti, variazione sul periodo precedente e, sulla
                carta, la zona in primo piano dominio per dominio contro la mediana delle altre. <strong>Fonti a confronto</strong>: media e giorni estremi di ogni
                fonte, quanto le fonti concordano, giorni oltre le soglie di caldo. <strong>Ricoveri</strong>: ultimo anno, andamento e province per tasso. Nella <strong>Stagionalità</strong>: periodi critici e mese peggiore, su <strong>Quando intervenire</strong> anche ospedalizzazione e zone da privilegiare (sotto), rango dei mesi, mese peggiore di ogni
                anno, valori di un mese anno per anno, scarto dagli anni precedenti, limiti superati, dati in ritardo. I numeri della Stagionalità sono quelli
                già calcolati dalla tab, non rifatti.</li>
              <li>Si sceglie una delle <strong>domande proposte</strong> o se ne scrive una (al più 400 caratteri, Invio per inviare). La risposta arriva intera in
                qualche secondo; la prima dopo l'avvio del computer può metterci di più.</li>
            </ul>
          </Sotto>
          <Sotto id="assistente-iniziativa" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>Lo <strong>scopo di ONE</strong> è guidare chi organizza i servizi verso la <strong>medicina di iniziativa</strong>: andare incontro ai malati cronici e
                agli anziani fragili prima che arrivino in pronto soccorso, per <strong>ridurre l'ospedalizzazione evitabile</strong>.</li>
              <li>Le domande su questo tema si fanno dal cuore di <strong>Quando intervenire</strong>, in cima alla Stagionalità: «Come si può ridurre l'ospedalizzazione?»,
                «Quali zone privilegiare per l'assistenza ADI?», «Come ridurre le ospedalizzazioni ripetute?», «Prepara un report con le linee d'azione», oltre a «Che cos'è la medicina di iniziativa?».
                Sulle altre schede ONE non risponde su questo tema.</li>
              <li>ONE dice <strong>quando</strong> (i periodi critici), <strong>dove</strong> e <strong>su cosa</strong> concentrare le azioni, e accanto mette le leve
                organizzative scritte nei documenti del progetto: chiamata attiva, ADI, medici e infermieri di famiglia, dimissioni protette, piani per l'inverno e per il caldo.</li>
              <li>Le zone si ordinano tema per tema, senza punteggio unico, sugli ultimi 12 mesi: <strong>ricoveri</strong> respiratori e circolatori, accessi in pronto
                soccorso <strong>a bassa urgenza</strong> degli assistiti in ADI, <strong>ritorni</strong> in pronto soccorso entro 30 giorni. Una zona è prioritaria se è fra
                le prime 3 per almeno 2 temi. Dal Salento si confrontano i 20 distretti, da un distretto i suoi comuni con almeno 5000 residenti; accanto, alberi,
                suolo impermeabile e caldo d'estate.</li>
              <li>ONE arriva al <strong>comune</strong>, non al quartiere: per un quartiere dice come stanno il comune e il distretto, la scelta resta al distretto con i
                dati dei medici di famiglia. Il <strong>report</strong> ha cinque parti (Quando, Dove, Cosa fare, Come verificare, Limiti) e si copia con «Copia in Markdown».</li>
              <li>Ricoveri, pronto soccorso e ADI sono <strong>dati simulati</strong> <BadgeSimulato dim={15} />: le indicazioni mostrano come
                lavorerebbe lo strumento con i dati veri. Sono spunti da valutare, non prescrizioni; ONE non nomina persone, non suggerisce terapie e non giudica enti.</li>
            </ul>
          </Sotto>
          <Sotto id="assistente-risposta" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>I <strong>numeretti</strong> nel testo sono le basi della risposta: passandoci sopra, il fatto calcolato o il brano del documento. <strong>Dati usati</strong>,
                sotto, li elenca in ordine.</li>
              <li>Le <strong>avvertenze</strong> (dato modellato o simulato, relazione esplorativa) le aggiunge il sistema, anche se il modello le dimentica.</li>
              <li>Prima di mostrare il testo, il sistema controlla che <strong>ogni numero</strong> sia nei fatti o nei documenti ricevuti e che il testo sia in italiano. Se
                qualcosa non torna, il testo non si mostra e restano i soli <strong>dati calcolati</strong>. Il controllo vede i numeri, non le parole: nel dubbio fanno fede i dati usati.</li>
              <li>Una relazione fra due grandezze è <strong>esplorativa</strong>, come nel resto della dashboard: dice che si muovono insieme, non che una causa l'altra.</li>
            </ul>
          </Sotto>
          <Sotto id="assistente-rifiuti" arrivo={arrivo}>
            <p className="info-paragrafo">
              L'elenco di argomenti e di analisi è <strong>chiuso</strong>: tutto il resto riceve sempre lo stesso messaggio, scritto dal sistema e non dal modello,
              «La richiesta non può essere processata o non esiste nessun dato a riguardo nel sistema.» Vale per gli altri argomenti, i consigli medici (le linee d'azione per organizzare i servizi invece sì), i nomi di persone, i giudizi su enti, le previsioni,
              le zone fuori dal Salento, i testi creativi, il codice, le domande sulle sue istruzioni, i decessi per comune e giorno (privacy) e i periodi che non sono
              in archivio. Risponde sempre in italiano.
            </p>
          </Sotto>
          <Sotto id="assistente-locale" arrivo={arrivo}>
            <p className="info-paragrafo">
              Il modello è <strong>Qwen3.5 4B</strong>, open source e preaddestrato, usato così com'è, senza addestramento sui dati del progetto. Gira con Ollama sullo
              stesso computer della dashboard: domande, dati e risposte non escono dal computer, per scelta del committente Parsec 3,26. Se il modello è spento, la chat
              lo dice e ogni domanda riceve i soli dati calcolati della scheda, senza commento.
            </p>
          </Sotto>
        </Tema>

        <Tema argomento="licenze" sottotitolo="Solo fonti pubbliche, ciascuna con la sua licenza">
          <Sotto id="licenze-aria" arrivo={arrivo}>
            <p className="info-paragrafo">ARPA Puglia (CC BY 4.0), OpenAQ (ODC-BY; 2 stazioni HabitatMap senza licenza dichiarata), EEA (CC BY 4.0), Copernicus CAMS (CC BY 4.0, modellato).</p>
          </Sotto>
          <Sotto id="licenze-calore" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>ERA5-Land, Copernicus (CC BY, modellato); rete meteo ARPA Puglia (CC BY 4.0, 15 stazioni nel Salento).</li>
              <li>Copernicus Land Monitoring Service, Tree Cover Density 2024 e Imperviousness Density 2018 (accesso libero, Reg. UE 1159/2013), con medie per comune elaborate da OneHealth. Verde urbano: ISTAT (CC BY 4.0).</li>
            </ul>
          </Sotto>
          <Sotto id="licenze-salute" arrivo={arrivo}>
            <ul className="elenco-informazioni">
              <li>Decessi giornalieri per comune ISTAT (CC BY 4.0, provvisori negli ultimi mesi), mostrati solo per distretto e mese; bilancio demografico mensile ISTAT ed Eurostat (CC BY 4.0) per la verifica; dimissioni ospedaliere ISTAT Health for All (CC BY 4.0), provincia × anno, 1999-2024, formato del file decodificato da OneHealth.</li>
              <li><strong>Ricoveri, PS e ADI giornalieri</strong>: <strong>dati simulati, non reali</strong>, generati da OneHealth e calibrati su aggregati pubblici.</li>
            </ul>
          </Sotto>
          <Sotto id="licenze-carta" arrivo={arrivo}>
            <p className="info-paragrafo">© OpenStreetMap contributors (ODbL). Confini: ISTAT via openpolis e distretti ASL Puglia. Font: Manrope (SIL OFL 1.1).</p>
          </Sotto>
          <Sotto id="licenze-assistente" arrivo={arrivo}>
            <p className="info-paragrafo">Modello Qwen3.5 4B, Qwen Team (Apache 2.0); Ollama (MIT). Documenti, analisi e controlli delle risposte: OneHealth.</p>
          </Sotto>
        </Tema>
      </div>
    </div>
  )
}
