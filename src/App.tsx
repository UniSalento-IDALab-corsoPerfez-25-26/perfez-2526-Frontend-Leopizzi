// Dashboard OneHealth, impianto a tab (09/10/2026): barra laterale con le tab e le zone a confronto; in alto la testata
// (dal 29/10/2026 una riga: periodo, dati della finestra, inquinante, e sotto l'asse del tempo), che sceglie la finestra
// (al più un mese) letta da tutta la pagina. Tab Mappa: la carta con la scheda della zona appoggiata a sinistra e la
// fonte in testa, poi numeri di testa, confronto fra zone e grafici. Poi Fonti a confronto, Riepilogo, Stagionalità (con
// la stessa testata dal 02/11/2026) e Informazioni, l'unico posto delle spiegazioni: ogni scheda vi rimanda con l'icona
// della guida.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { FONTE_ACCORPATA, type Scenario } from './api/client'
import { BadgeModellato, BadgeSimulato, Card, Errore, Vuoto, type AssistenteCard } from './componenti/comuni'
import AvvisoBackend from './componenti/AvvisoBackend'
import BarreConfronto from './componenti/BarreConfronto'
import CercaZona from './componenti/CercaZona'
import ConfrontoDomini from './componenti/ConfrontoDomini'
import ConfrontoFonti from './componenti/ConfrontoFonti'
import FontiCalore from './componenti/FontiCalore'
import FontiSalute from './componenti/FontiSalute'
import DettaglioZona from './componenti/DettaglioZona'
import BarraTemporale from './componenti/BarraTemporale'
import { FiltroFonte, FiltroInquinante, ZoneAConfronto, ZonePallini, type Domini } from './componenti/Filtri'
import GraficoAndamento from './componenti/GraficoAndamento'
import { IconaAlberi, IconaAria, IconaBarra, IconaCalore, IconaFonti, IconaInformazioni, IconaLuna, IconaMappa, IconaMarchio, IconaRiepilogo, IconaSalubrita, IconaSalute, IconaSole, IconaStagionalita, IconaSuolo } from './componenti/Icone'
import Informazioni from './componenti/Informazioni'
import Kpi from './componenti/Kpi'
import { InterruttoreAnimato } from './componenti/SegmentiAnimati'
import MappaZone, { MITIGAZIONE, calcolaClassi, eMitigazione, prefissoRampa, type Livello, type ModoMappa, type RichiestaVista } from './componenti/MappaZone'
import Stagionalita, { FiltriStagionalita } from './componenti/Stagionalita'
import TabellaRiepilogo from './componenti/TabellaRiepilogo'
import { etichettaGiornoCompleto, giorniTra, mesiTra, numero, spostaGiorno, spostaMese } from './lib/formato'
import { eDistretto, nomeBreve, useAriaFinestra, useCaloreMappa, useCalendarioAria, useConfini, useDecessiPeriodo, useDettaglioZona, useDimissioni, useDisponibilita, useIndiceTerritorio, useRiepilogo, useSalubritaMappa, useSaluteMappa, useSimulatiFinestra } from './stato/dati'
import { ETICHETTA_BANDA, coloreBanda, type Banda } from './lib/salubrita'
import { ChatProvider, type CardAssistente } from './stato/assistente'
import { eSezioneGuida, GuidaProvider, type SezioneGuida } from './stato/guida'
import { TemaProvider, useTema } from './stato/token'
import { alterna, type ZonaScelta } from './stato/zone'

/** Il valore, con un ritardo: la barra scorre di continuo, la richiesta parte quando si ferma. */
function useRitardato<T>(valore: T, ms: number): T {
  const [v, setV] = useState(valore)
  useEffect(() => {
    const t = setTimeout(() => setV(valore), ms)
    return () => clearTimeout(t)
  }, [valore, ms])
  return v
}

const TAB = [
  ['mappa', 'Mappa'],
  ['fonti', 'Fonti a confronto'],
  ['riepilogo', 'Riepilogo'],
  ['stagionalita', 'Stagionalità'],
  ['info', 'Informazioni'],
] as const
type IdTab = (typeof TAB)[number][0]

/** La tab dall'indirizzo (#stagionalita, #riepilogo...): si può aprire o condividere direttamente una sezione, anche
 *  una sezione di Informazioni (#info/carta). */
function tabDaIndirizzo(): IdTab {
  const h = window.location.hash.slice(1).split('/')[0]
  return (TAB.find(([id]) => id === h)?.[0] ?? 'mappa') as IdTab
}
function sezioneDaIndirizzo(): SezioneGuida | null {
  const [tab, sezione] = window.location.hash.slice(1).split('/')
  return tab === 'info' && sezione && eSezioneGuida(sezione) ? sezione : null
}

const ICONA_TAB: Record<IdTab, () => ReactNode> = {
  mappa: IconaMappa, fonti: IconaFonti, riepilogo: IconaRiepilogo, stagionalita: IconaStagionalita, info: IconaInformazioni,
}

/** Chiave nuova dal 29/10/2026: la barra parte chiusa la prima volta per tutti (anche per chi l'aveva aperta prima). */
const CHIAVE_BARRA = 'onehealth.barra-aperta'
const CHIAVE_SCENARIO = 'onehealth.scenario'

/** Scenario dei dati simulati, uno per tutta la pagina (default «letteratura», quello della tesi): ricordato nel browser
 *  come la barra laterale, la pagina funziona anche senza. */
function useScenario(): [Scenario, (s: Scenario) => void] {
  const [scenario, setStato] = useState<Scenario>(() => {
    try { return localStorage.getItem(CHIAVE_SCENARIO) === 'nullo' ? 'nullo' : 'letteratura' } catch { return 'letteratura' }
  })
  const setScenario = (s: Scenario) => {
    setStato(s)
    try { localStorage.setItem(CHIAVE_SCENARIO, s) } catch { /* storage non disponibile: vale per la sessione */ }
  }
  return [scenario, setScenario]
}

/** Barra laterale aperta o chiusa: chiusa la prima volta (29/10/2026, scelta di Matteo: la carta prende tutto lo
 *  schermo), poi la scelta si ricorda nel browser (localStorage); la pagina funziona anche senza. */
function useBarraChiusa(): [boolean, () => void] {
  const [chiusa, setChiusa] = useState(() => {
    try { return localStorage.getItem(CHIAVE_BARRA) !== '1' } catch { return true }
  })
  const alternaBarra = () => setChiusa((c) => {
    try { localStorage.setItem(CHIAVE_BARRA, c ? '1' : '0') } catch { /* storage non disponibile: la scelta vale per la sessione */ }
    return !c
  })
  return [chiusa, alternaBarra]
}

/** Ordine delle tab nella barra laterale: quello dei gruppi per compito del 29/10/2026 (Mappa e Stagionalità, poi Fonti a
 *  confronto e Riepilogo, poi Informazioni), dal 02/11/2026 (scelta di Matteo) in un elenco solo, senza i titoli dei
 *  gruppi. Mappa resta la tab di apertura. */
const ORDINE_TAB: IdTab[] = ['mappa', 'stagionalita', 'fonti', 'riepilogo', 'info']
const NOME_TAB = Object.fromEntries(TAB) as Record<IdTab, string>

/** Fin dove arriva ogni dominio nell'archivio, in fondo alla barra (al posto delle note «Dataset aria generato il…»). */
const AGGIORNATI: { id: string; nome: string; Icona: () => ReactNode; simulato?: boolean }[] = [
  { id: 'aria', nome: 'Aria', Icona: IconaAria },
  { id: 'calore', nome: 'Calore', Icona: IconaCalore },
  { id: 'decessi', nome: 'Decessi', Icona: IconaSalute },
  { id: 'simulati', nome: 'PS e ADI', Icona: IconaSalute, simulato: true },
]

/** Barra laterale (fase 3 della revisione, 29/10/2026): marchio, tab (dal 02/11/2026 senza gruppi), zone a confronto,
 *  fin dove arrivano i dati e tema. Chiusa resta una colonna di icone, col nome nel tooltip, e le zone diventano pallini colorati. */
function Navigazione({ fino, tab, setTab, zoneConfronto, zonePallini, chiusa, onAlterna }: {
  /** Ultimo giorno di ogni dominio (`periodo_completo.fino_al` di /api/aria/calendario). */
  fino: Record<string, string | null | undefined> | null
  tab: IdTab
  setTab: (t: IdTab) => void
  zoneConfronto: ReactNode
  zonePallini: ReactNode
  chiusa: boolean
  onAlterna: () => void
}) {
  const { tema, cambiaTema } = useTema()
  const altroTema = tema === 'scuro' ? 'Tema chiaro' : 'Tema scuro'
  const azioneBarra = chiusa ? 'Apri la barra laterale' : 'Chiudi la barra laterale'
  return (
    <aside className="barra-laterale">
      <div className="marchio">
        <span className="marchio-segno" aria-hidden="true"><IconaMarchio dim={24} /></span>
        <span className="marchio-nome">OneHealth</span>
        <button type="button" className="barra-alterna" onClick={onAlterna} aria-expanded={!chiusa} aria-label={azioneBarra} title={azioneBarra}>
          <IconaBarra chiusa={chiusa} />
        </button>
      </div>
      <nav aria-label="Sezioni" className="nav" role="tablist" aria-orientation="vertical">
        {ORDINE_TAB.map((id) => {
          const Icona = ICONA_TAB[id]
          const nome = NOME_TAB[id]
          return (
            <button key={id} type="button" role="tab" id={`tab-${id}`} aria-controls="pannello-tab" aria-selected={tab === id}
                    className="nav-voce" onClick={() => setTab(id)} title={chiusa ? nome : undefined} aria-label={chiusa ? nome : undefined}>
              <Icona /><span className="nav-nome">{nome}</span>
            </button>
          )
        })}
      </nav>
      {chiusa ? zonePallini : zoneConfronto}
      <div className="barra-piede">
        {!chiusa && fino && (
          <section className="aggiornati" aria-label="Fin dove arrivano i dati">
            <span className="nav-gruppo-nome">Dati fino al</span>
            <dl>
              {AGGIORNATI.filter((d) => fino[d.id]).map((d) => (
                <div key={d.id}>
                  <dt><d.Icona />{d.nome}{d.simulato && <BadgeSimulato dim={15} />}</dt>
                  <dd>{etichettaGiornoCompleto(fino[d.id] as string)}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <button type="button" className="nav-tema" onClick={cambiaTema} aria-pressed={tema === 'scuro'}
                title={chiusa ? altroTema : undefined} aria-label={chiusa ? altroTema : undefined}>
          {tema === 'scuro' ? <IconaSole /> : <IconaLuna />}<span className="nav-nome">{altroTema}</span>
        </button>
      </div>
    </aside>
  )
}

/** Testata fissa che si compatta scorrendo (19/10/2026): oltre la sua altezza resta la sola riga dei controlli, senza
 *  l'asse del tempo (dal 29/10/2026 la riga è già tutta la testata), e torna intera in cima alla pagina; la differenza
 *  fra le due soglie evita che oscilli. Il contenuto sotto non salta quando la testata cambia altezza grazie allo scroll
 *  anchoring del browser (overflow-anchor), che corregge lo scorrimento da solo: una compensazione nostra si sommerebbe
 *  alla sua (verificato: riportava in cima). */
function useTestataCompatta() {
  const testata = useRef<HTMLDivElement>(null)
  const [compatta, setCompatta] = useState(false)
  const [attaccata, setAttaccata] = useState(false)
  const altezzaPiena = useRef(0)
  const compattaOra = useRef(false)

  useEffect(() => {
    const scorri = () => {
      const y = window.scrollY
      // attaccata al bordo dello schermo (oltre i 10px di margine della finestra) la testata perde gli angoli tondi:
      // fuori dalla curva si vedeva il blocco che le scorre sotto. Stato, non classe a mano (il render la cancellerebbe);
      // React non ridisegna finché il valore non cambia
      setAttaccata(y >= 10)
      const c = compattaOra.current
      const nuova = c ? y > 8 : y > altezzaPiena.current + 24
      if (nuova === c) return
      // in cima la testata torna piena: lì l'ancoraggio terrebbe ferma la mappa e spingerebbe la pagina giù di tutta
      // la differenza, lontano dalla cima che si voleva vedere; lo si sospende per quel solo cambio
      if (!nuova) document.documentElement.style.overflowAnchor = 'none'
      compattaOra.current = nuova
      setCompatta(nuova)
    }
    scorri()
    window.addEventListener('scroll', scorri, { passive: true })
    return () => window.removeEventListener('scroll', scorri)
  }, [])

  useEffect(() => {
    if (compatta) return
    const t = requestAnimationFrame(() => { document.documentElement.style.overflowAnchor = '' })
    return () => cancelAnimationFrame(t)
  }, [compatta])

  // la soglia segue l'altezza piena vera, che cambia da sola (dati che arrivano, filtri che vanno a capo)
  useEffect(() => {
    const el = testata.current
    if (!el) return
    const osservatore = new ResizeObserver(() => {
      if (!el.classList.contains('compatta')) altezzaPiena.current = el.offsetHeight
    })
    osservatore.observe(el)
    return () => osservatore.disconnect()
  }, [])

  return { compatta, attaccata, testata }
}

/** Icona del titolo della carta: la stessa della particella della vista scelta. */
const ICONA_MODO: Record<ModoMappa, () => ReactNode> = {
  valore: IconaAria, salubrita: IconaSalubrita, temperatura: IconaCalore, alberi: IconaAlberi, suolo: IconaSuolo, salute: IconaSalute,
}

/** Fonte di ciò che la carta colora, in testa alla carta (29/10/2026, fase 4): nella vista Aria si sceglie (prima stava
 *  nella testata), nelle altre viste la si dice soltanto. */
const FONTE_VISTA: Record<Exclude<ModoMappa, 'valore'>, ReactNode> = {
  salubrita: 'tutte le fonti, limiti del D.Lgs. 155/2010',
  temperatura: <>ERA5-Land <BadgeModellato dim={16} /></>,
  alberi: 'Copernicus CLMS, 2024',
  suolo: 'Copernicus CLMS, 2018',
  salute: <>decessi ISTAT e dati simulati <BadgeSimulato dim={16} /></>,
}

const BANDE_LEGENDA: Banda[] = ['buona', 'accettabile', 'scadente', 'cattiva', 'non_confrontabile']

function LegendaMappa({ classi, unita, fonteModellata, inAttesa, modo }: { classi: ReturnType<typeof calcolaClassi>; unita: string | null; fonteModellata: boolean; inAttesa: boolean; modo: ModoMappa }) {
  // un'unica barra ordinata: a sinistra la scala (valore) o le bande (salubrità), a destra gli stati
  return (
    <div className="legenda-mappa">
      {modo === 'salubrita' ? (
        <ul className="legenda-bande-mappa" title="Rispetto ai limiti di legge (D.Lgs. 155/2010), peggiore inquinante: la scala NON è min-max ma il rapporto coi limiti">
          {BANDE_LEGENDA.map((b) => (
            <li key={b}><i className="campione" style={{ background: coloreBanda(b) }} /> {ETICHETTA_BANDA[b]}</li>
          ))}
        </ul>
      ) : (
        <div className="legenda-scala" title={eMitigazione(modo)
          ? `${MITIGAZIONE[modo].nota}. Cinque classi a intervalli uguali fra minimo e massimo delle zone: dato statico, non dipende dalla finestra`
          : modo === 'salute'
            ? 'Decessi (ISTAT) + ricoveri respiratori e circolatori + accessi in PS per 100.000 residenti al giorno: ricoveri e PS sono simulati. '
              + 'I comuni hanno il valore del loro distretto (decessi per comune: privacy). Cinque classi a intervalli uguali fra minimo e massimo della finestra'
            : 'Cinque classi a intervalli uguali fra minimo e massimo della finestra, non soglie di legge'}>
          {classi ? (
            <>
              <span className="legenda-estremo">{numero(classi.min)}</span>
              {[1, 2, 3, 4, 5].map((i) => <i key={i} style={{ background: `var(--${prefissoRampa(modo)}-${i})` }} />)}
              <span className="legenda-estremo">{numero(classi.max)} {unita}</span>
              {modo === 'salute' && <BadgeSimulato />}
              {modo === 'valore' && fonteModellata && <BadgeModellato />}
            </>
          ) : (
            <span className="testo-stato">{inAttesa ? 'dati in caricamento…' : 'nessun valore da colorare'}</span>
          )}
        </div>
      )}
      <ul className="legenda-stati">
        <li><i className="campione campione-nodata" /> N/D</li>
        {modo === 'valore' && !fonteModellata && (
          <li title="Nessuna stazione fisica di nessuna fonte: l'unico dato aria è CAMS, modellato. Non dipende dal periodo.">
            <i className="campione campione-senza-stazioni" /> senza stazioni
          </li>
        )}
        <li><i className="campione campione-scelta" /> confronto</li>
        {modo === 'valore' && <li><i className="campione campione-null" /> null</li>}
        {modo === 'valore' && !fonteModellata && <li><i className="campione campione-stazione" /> stazione con valori</li>}
        {modo === 'valore' && !fonteModellata && <li><i className="campione campione-stazione-vuota" /> stazione senza valori</li>}
      </ul>
    </div>
  )
}

function Dashboard() {
  const indice = useIndiceTerritorio()
  const confini = useConfini()
  const disp = useDisponibilita()

  const [scelta, setScelta] = useState<[string, string] | null>(null)
  const [inquinante, setInquinante] = useState('PM2.5')
  // «Tutte» come in Stagionalità (30/10/2026, scelta di Matteo): la carta si apre colorata su tutti i distretti, CAMS col
  // cubo dove non ci sono stazioni; ARPA e le altre fonti restano a un clic
  const [fonte, setFonte] = useState(FONTE_ACCORPATA)
  const [livello, setLivello] = useState<Livello>('distretti')
  const [modoMappa, setModoMappa] = useState<ModoMappa>('valore')
  const [zone, setZone] = useState<ZonaScelta[]>([{ id: 'LE-51', slot: 1 }])
  const [focus, setFocus] = useState<string | null>('LE-51')
  const [piena, setPiena] = useState(false)
  const [durata, setDurata] = useState(12)
  const [stazioni, setStazioni] = useState(true)
  const [nomi, setNomi] = useState(true)
  const [dettaglioAperto, setDettaglioAperto] = useState(true)
  const alternaDettaglio = () => setDettaglioAperto((a) => !a)
  // px della carta coperti a sinistra dalla scheda della zona (li misura DettaglioZona): la mappa inquadra il resto
  const [riserva, setRiserva] = useState(0)
  // zona appena scelta dalla ricerca sulla carta: la mappa la porta in vista se non si vede
  const [inVista, setInVista] = useState<RichiestaVista | null>(null)
  const [tab, setTabStato] = useState<IdTab>(tabDaIndirizzo)
  const [sezioneInfo, setSezioneInfo] = useState<SezioneGuida | null>(sezioneDaIndirizzo)
  // chat dell'assistente (31/10/2026): una sola card alla volta; cambiando tab si chiude, la card non è più a schermo
  const [chatAperta, setChatAperta] = useState<CardAssistente | null>(null)
  // la colonna di destra in cui la card disegna la chat (01/11/2026): una ref di stato, perché la chat aspetti che esista
  const [colonnaChat, setColonnaChat] = useState<HTMLElement | null>(null)
  const setTab = (t: IdTab) => {
    setTabStato(t)
    setSezioneInfo(null)
    setChatAperta(null)
    window.history.replaceState(null, '', t === 'mappa' ? window.location.pathname : `#${t}`)
  }
  // icona della guida di una scheda: Informazioni aperta sul sottoargomento che la spiega
  const apriGuida = (sezione: SezioneGuida) => {
    setChatAperta(null)
    setTabStato('info')
    setSezioneInfo(sezione)
    window.history.replaceState(null, '', `#info/${sezione}`)
  }
  const [domini, setDomini] = useState<Domini>({ ricoveri: true, simulati: true })
  const [scenario, setScenario] = useScenario()
  // filtri di Stagionalità, nella testata fissa (02/11/2026): restano scegliendo un'altra tab e tornando
  const [zonaStagione, setZonaStagione] = useState('SALENTO')
  const [fonteStagione, setFonteStagione] = useState(FONTE_ACCORPATA)
  // PS, ADI e ricoveri simulati contano fra i temi critici (scelta di Matteo del 25/10/2026); l'interruttore li toglie
  const [simulatiSintesi, setSimulatiSintesi] = useState(true)
  const [barraChiusa, alternaBarra] = useBarraChiusa()
  const { compatta, attaccata, testata } = useTestataCompatta()

  // barra temporale: l'asse è tutto l'archivio, la finestra (al più un mese) è ciò che leggono mappa, classifica,
  // numeri di testa, pannello della zona e riepilogo. Si apre sull'ultimo mese coperto da tutti i domini (28/10/2026):
  // sugli ultimi giorni d'aria decessi, calore e simulati non sono ancora arrivati e la pagina era fatta di N/D
  const calendario = useCalendarioAria().data
  const asseDa = calendario?.da ?? null
  const asseA = calendario?.a ?? null
  const periodoCompleto = calendario?.periodo_completo ?? null
  const completo: [string, string] | null = periodoCompleto ? [periodoCompleto.da, periodoCompleto.a] : null
  const inizioUltimi = asseA && calendario ? spostaGiorno(asseA, -(calendario.finestra_predefinita - 1)) : null
  const ultimi: [string, string] | null = asseDa && asseA && inizioUltimi ? [inizioUltimi < asseDa ? asseDa : inizioUltimi, asseA] : null
  const grezza: [string, string] | null = asseDa && asseA
    ? (scelta && scelta[0] >= asseDa && scelta[1] <= asseA ? scelta : completo ?? ultimi)
    : null
  const chiave = useRitardato(grezza ? grezza.join('|') : null, 250)
  const [inizio, fine] = chiave ? (chiave.split('|') as [string, string]) : [null, null]
  const ampiezza = inizio && fine ? giorniTra(inizio, fine) : 0
  const coperti = useMemo(() => new Set(calendario?.giorni ?? []), [calendario])
  const aria = useAriaFinestra(inizio, fine, fonte)
  const salubrita = useSalubritaMappa(inizio, fine, modoMappa === 'salubrita')
  const calore = useCaloreMappa(inizio, fine, modoMappa === 'temperatura')
  // eventi sanitari: per la vista «Salute» e per il dato di sintesi della particella Salute, quindi sempre sulla Mappa
  const saluteMappa = useSaluteMappa(inizio, fine, scenario, tab === 'mappa')

  // la finestra precedente (stessa ampiezza) serve alla variazione del riepilogo. I decessi sono mensili (privacy):
  // si leggono sui mesi toccati dalla finestra, più altrettanti mesi prima per la variazione. I grafici sotto la
  // mappa leggono ancora il mese in cui finisce la finestra, finché non passano alla finestra (passi 6-7).
  const finePrima = inizio ? spostaGiorno(inizio, -1) : null
  const inizioPrima = finePrima ? spostaGiorno(finePrima, -(ampiezza - 1)) : null
  const ariaPrima = useAriaFinestra(inizioPrima, finePrima, fonte)
  const mesi = inizio && fine ? mesiTra(inizio, fine) : []
  const mese = fine ? fine.slice(0, 7) : null
  const decessi = useDecessiPeriodo(mesi.length ? spostaMese(mesi[0], -mesi.length) : null, mese)
  const annoFine = fine ? Number(fine.slice(0, 4)) : null
  const dimissioni = useDimissioni(annoFine != null ? Math.max(1999, annoFine - 2) : null, annoFine, ['LE', 'BR', 'TA'], ['respiratorio'])
  const dettaglio = useDettaglioZona(focus, inizio, fine, scenario)
  const riepilogo = useRiepilogo(inizio, fine, fonte, scenario, tab === 'riepilogo')
  const simulatiDisponibili = !!disp.data?.simulati?.disponibile
  const mostraSimulati = simulatiDisponibili && domini.simulati
  const simulatiSalento = useSimulatiFinestra('SALENTO', inizio, fine, scenario, tab === 'mappa' && mostraSimulati)
  const periodoEtichetta = inizio && fine ? `${etichettaGiornoCompleto(inizio)} → ${etichettaGiornoCompleto(fine)}` : ''
  const filtroFonte = <FiltroFonte fonti={aria.data?.fonti ?? []} fonte={fonte} setFonte={setFonte} />
  // ONE sulla carta, sulla Sintesi e sul Riepilogo (03/11/2026): la finestra della testata, l'inquinante, la fonte e le
  // zone a confronto; per la carta anche vista, livello e zona in primo piano, perché la sua chat risponde anche sulla
  // scheda della zona (scelta di Matteo). Cambiando uno di questi la conversazione riparte.
  const titoloMappa = `${modoMappa === 'temperatura' ? 'Temperatura media' : modoMappa === 'salubrita' ? "Salubrità dell'aria"
    : modoMappa === 'salute' ? 'Eventi sanitari' : eMitigazione(modoMappa) ? MITIGAZIONE[modoMappa].titolo : inquinante} per ${livello === 'distretti' ? 'distretto' : 'comune'}`
  const finestraAssistente = inizio && fine ? { giorno_da: inizio, giorno_a: fine, inquinante, fonte, zone: zone.map((z) => z.id), scenario } : null
  const descrizioneFinestra = [periodoEtichetta, fonte === FONTE_ACCORPATA ? 'fonti concordi' : fonte].filter(Boolean).join(', ')
  const assistenteMappa: AssistenteCard = {
    card: 'mappa', titolo: titoloMappa,
    descrizione: [focus && `in primo piano ${nomeBreve(indice, focus)}`, descrizioneFinestra].filter(Boolean).join(', '),
    contesto: finestraAssistente && { ...finestraAssistente, vista: modoMappa, livello, primo_piano: focus },
  }
  const assistenteSintesi: AssistenteCard = {
    card: 'sintesi', titolo: 'Sintesi della finestra', descrizione: descrizioneFinestra,
    contesto: finestraAssistente && { ...finestraAssistente, livello },
  }
  const assistenteRiepilogo: AssistenteCard = {
    card: 'riepilogo', titolo: 'Riepilogo per distretto', descrizione: descrizioneFinestra, contesto: finestraAssistente,
  }
  // le etichette del riepilogo seguono i dati mostrati: durante un caricamento restano quelle dei dati precedenti
  const etichetta = (x?: { da: string; a: string } | null) => (x ? `${etichettaGiornoCompleto(x.da)} → ${etichettaGiornoCompleto(x.a)}` : '')

  const inquinanti = disp.data?.inquinanti ?? []
  const presenti = new Set(aria.data?.inquinanti ?? [])
  const inquinantiFiltro = inquinanti.filter((i) => i.riferimento || presenti.has(i.id))
  const unita = inquinanti.find((i) => i.id === inquinante)?.unita ?? null
  const fonteModellata = aria.data?.fonte_modellata ?? false
  // le stazioni hanno senso solo nella vista «valore» di una fonte misurata
  const stazioniAttive = modoMappa === 'valore' && !fonteModellata

  const classi = useMemo(() => {
    if (eMitigazione(modoMappa)) {
      // attributi statici dell'anagrafica (CLMS): la scala è fra le zone del livello, non della finestra
      const campo = MITIGAZIONE[modoMappa].campo
      const zoneLivello = [...((livello === 'distretti' ? indice?.distretti : indice?.comuni)?.values() ?? [])]
      return calcolaClassi(zoneLivello.map((z) => z[campo]).filter((v): v is number => v != null))
    }
    if (modoMappa === 'temperatura' || modoMappa === 'salute') {
      const dati = modoMappa === 'salute' ? saluteMappa.data : calore.data
      const celle = Object.values((livello === 'distretti' ? dati?.distretti : dati?.comuni) ?? {})
      return calcolaClassi(celle.filter((c) => c.stato === 'VALORE' && c.valore != null).map((c) => c.valore as number))
    }
    const sorgente = livello === 'distretti' ? aria.data?.distretti : aria.data?.comuni
    const valori = Object.values(sorgente ?? {})
      .map((c) => c[inquinante])
      .filter((c) => c?.stato === 'VALORE' && c.valore != null)
      .map((c) => c!.valore as number)
    return calcolaClassi(valori)
  }, [aria.data, calore.data, saluteMappa.data, modoMappa, livello, inquinante, indice])

  useEffect(() => {
    if (!piena) return
    const t = setTimeout(() => setPiena(false), 5000)
    return () => clearTimeout(t)
  }, [piena])

  const clicZona = (id: string) => {
    if (!zone.some((z) => z.id === id)) {
      const r = alterna(zone, id)
      setPiena(r.piena)
      if (!r.piena) setZone(r.zone)
      setFocus(id)
      return
    }
    setPiena(false)
    if (focus !== id) setFocus(id) // primo clic su una zona già a confronto: in primo piano
    else setZone(alterna(zone, id).zone) // secondo clic: fuori dal confronto
  }
  const alternaZona = (id: string) => {
    const r = alterna(zone, id)
    setPiena(r.piena)
    if (!r.piena) setZone(r.zone)
  }
  // mappa: singolo clic = porta la zona nella scheda sulla carta; doppio clic = aggiungi/togli dal confronto, come
  // l'azione «Aggiungi al confronto» della scheda (fase 6, 29/10/2026)
  const dettaglioZona = (id: string) => { setPiena(false); setFocus(id) }
  // ricerca sulla carta (29/10/2026, scelte di Matteo): la zona va in primo piano come con un clic, non nel confronto;
  // il livello segue il tipo di zona, la scheda si riapre se era chiusa e la carta scorre solo se la zona non si vede
  const scegliDaRicerca = (id: string) => {
    setPiena(false)
    setLivello(eDistretto(id) ? 'distretti' : 'comuni')
    setFocus(id)
    setDettaglioAperto(true)
    setInVista((r) => ({ id, n: (r?.n ?? 0) + 1 }))
  }
  const confrontaZona = (id: string) => { alternaZona(id); setFocus(id) }
  // l'inquinante della testata colora la carta solo nella vista «Aria»: sceglierlo da un'altra vista (temperatura,
  // salute…) cambiava i numeri sotto ma non la carta. Sulla Mappa la scelta riporta quindi la carta sull'aria (30/10/2026)
  const scegliInquinante = (id: string) => {
    setInquinante(id)
    if (tab === 'mappa' && modoMappa !== 'valore') setModoMappa('valore')
  }

  if (disp.isError) {
    return (
      <main className="principale">
        <Errore errore={disp.error} />
      </main>
    )
  }

  return (
    <GuidaProvider value={apriGuida}>
    <ChatProvider value={{ aperta: chatAperta, apri: setChatAperta, colonna: colonnaChat }}>
    <div className={`app${barraChiusa ? ' barra-chiusa' : ''}`}>
      <Navigazione fino={periodoCompleto?.fino_al ?? null} tab={tab} setTab={setTab} chiusa={barraChiusa} onAlterna={alternaBarra}
                   zoneConfronto={
                     <ZoneAConfronto zone={zone} focus={focus} indice={indice} piena={piena}
                                     onTogli={(id) => alternaZona(id)} onFocus={setFocus} onSvuota={() => { setZone([]); setPiena(false) }} />
                   }
                   zonePallini={<ZonePallini zone={zone} focus={focus} indice={indice} onFocus={setFocus} />} />
      <main className="principale">
        {/* testata a una riga (29/10/2026, fase 4): periodo, dati della finestra (domini e scenario), inquinante; sotto
            l'asse, che scorrendo si nasconde. Dal 02/11/2026 (scelta di Matteo) c'è anche in Stagionalità, con i filtri
            della tab al posto dell'inquinante. Informazioni non dipende dalla finestra: lì la testata non serve */}
        <div ref={testata} className={`filtri-fissi${compatta ? ' compatta' : ''}${attaccata ? ' attaccata' : ''}`} hidden={tab === 'info'}>
          <div className="testata-scheda">
          {asseDa && asseA && grezza && ultimi && calendario && (
            <BarraTemporale asseDa={asseDa} asseA={asseA} coperti={coperti} inizio={grezza[0]} fine={grezza[1]}
                            onFinestra={(da, a) => setScelta([da, a])} massima={calendario.finestra_massima}
                            completo={periodoCompleto} ultimi={ultimi}
                            fonti={(aria.data?.fonti ?? []).map((f) => f.nome)} disponibilita={disp.data}
                            domini={domini} setDomini={setDomini} scenario={scenario} setScenario={setScenario}
                            filtro={tab === 'stagionalita'
                              ? <FiltriStagionalita indice={indice} zona={zonaStagione} setZona={setZonaStagione} fonte={fonteStagione} setFonte={setFonteStagione}
                                                    scenario={scenario} setScenario={setScenario} simulatiNellaSintesi={simulatiSintesi} setSimulatiNellaSintesi={setSimulatiSintesi} />
                              : <FiltroInquinante inquinanti={inquinantiFiltro} inquinante={inquinante} setInquinante={scegliInquinante} />} />
          )}
          </div>
        </div>

        {periodoEtichetta && aria.data === null && (
          <Vuoto titolo={`L'archivio dell'aria non copre ancora ${periodoEtichetta}`} />
        )}
        {aria.isError && <Errore errore={aria.error} />}

        {/* contenuto della tab e, a destra, il posto della chat dell'assistente (01/11/2026): la chat sta ferma nella
            finestra principale, intera, e testata e contenuto si stringono a sinistra senza finirle sotto */}
        <div className="corpo-principale">
        <div id="pannello-tab" role="tabpanel" aria-labelledby={`tab-${tab}`} className="pannello-tab">

        {/* la carta prima di tutto (fase 2 della revisione, 28-29/10/2026): la scheda della zona le sta sopra, a
            sinistra, con il livello e le particelle dei colori; Stazioni e Nomi nell'angolo in basso a destra; i numeri
            di testa scendono sotto. Niente più barra dei controlli sopra la carta */}
        {tab === 'mappa' && (
          <Card
            id="mappa"
            className="card-mappa"
            icona={(() => { const IconaCarta = ICONA_MODO[modoMappa]; return <IconaCarta /> })()}
            caricamento={aria.isFetching || (modoMappa === 'salubrita' && salubrita.isFetching) || (modoMappa === 'temperatura' && calore.isFetching)
              || (modoMappa === 'salute' && saluteMappa.isFetching)}
            titolo={titoloMappa}
            azioni={modoMappa === 'valore' ? filtroFonte : <p className="fonte-carta"><span>Fonte</span> {FONTE_VISTA[modoMappa]}</p>}
            guida="carta"
            assistente={assistenteMappa}
          >
            {/* scheda e carta nella stessa cella: se il dominio aperto è più alto della carta, la carta si allunga */}
            <div className="carta">
              <DettaglioZona id={focus} dettaglio={dettaglio.data} errore={dettaglio.error} caricamento={dettaglio.isFetching}
                             inquinanti={inquinanti} inquinanteScelto={inquinante} indice={indice} zone={zone}
                             mostraSimulati={mostraSimulati} modo={modoMappa} onModo={setModoMappa} livello={livello} onLivello={setLivello}
                             salute={saluteMappa.data} aperta={dettaglioAperto} onAlterna={alternaDettaglio} onRiserva={setRiserva}
                             onConfronto={alternaZona} />
              {confini.data ? (
                <MappaZone confini={confini.data} aria={aria.data} indice={indice} inquinante={inquinante} unita={unita}
                           livello={livello} zone={zone} focus={focus} classi={classi} mostraStazioni={stazioni && stazioniAttive} mostraNomi={nomi}
                           modo={modoMappa} salubrita={salubrita.data} calore={calore.data} salute={saluteMappa.data} fonteModellata={fonteModellata}
                           riserva={riserva} inVista={inVista} onDettaglio={dettaglioZona} onConfronto={confrontaZona} />
              ) : confini.isError ? <Errore errore={confini.error} /> : <div className="mappa mappa-attesa" />}
              {/* ricerca in alto a destra, accanto allo zoom (29/10/2026) */}
              <CercaZona indice={indice} focus={focus} onScegli={scegliDaRicerca} />
              {/* stazioni e nomi sulla carta, nell'angolo in basso a destra (29/10/2026, scelta di Matteo); le stazioni si
                  accendono solo con la vista «Aria» di una fonte misurata */}
              <div className="filtro carta-mostra" role="group" aria-label="Elementi della carta">
                <span className="filtro-nome">Mostra</span>
                <InterruttoreAnimato etichetta="Stazioni fisiche sulla mappa" attivo={stazioniAttive && stazioni} disabilitato={!stazioniAttive}
                                     onCambia={() => setStazioni(!stazioni)} testo="Stazioni"
                                     titolo={stazioniAttive ? 'Mostra o nascondi le stazioni fisiche della fonte scelta'
                                       : modoMappa !== 'valore' ? 'Le stazioni si mostrano solo nella vista «Aria»'
                                       : `${fonte} è un modello: non ha stazioni fisiche`} />
                <InterruttoreAnimato etichetta="Nomi dei comuni sulla mappa" attivo={nomi} onCambia={() => setNomi(!nomi)} testo="Nomi"
                                     titolo="Nomi dei comuni che entrano nel loro territorio a questo zoom: avvicinandosi aumentano" />
              </div>
            </div>
            <LegendaMappa classi={classi} fonteModellata={fonteModellata} modo={modoMappa}
                          unita={modoMappa === 'temperatura' ? (calore.data?.unita ?? '°C') : eMitigazione(modoMappa) ? '%' : modoMappa === 'salute' ? 'per 100.000 al giorno' : unita}
                          inAttesa={modoMappa === 'salubrita' ? salubrita.data === undefined : modoMappa === 'temperatura' ? calore.data === undefined
                            : modoMappa === 'salute' ? saluteMappa.data === undefined : eMitigazione(modoMappa) ? indice === null : aria.data === undefined} />
          </Card>
        )}

        {/* numeri di testa e classifica in una scheda sola, per dominio (02/11/2026) */}
        {tab === 'mappa' && mese && (
          <Kpi aria={aria.data} decessi={decessi.data} dimissioni={dimissioni.data} mesi={mesi} inquinante={inquinante} unita={unita} indice={indice}
               simulati={mostraSimulati ? simulatiSalento.data : false} periodo={periodoEtichetta} caricamento={aria.isFetching}
               assistente={assistenteSintesi}
               classifica={<BarreConfronto aria={aria.data} inquinante={inquinante} livello={livello} zone={zone} indice={indice} onAlterna={clicZona} />} />
        )}

        {tab === 'mappa' && <GraficoAndamento mese={mese} inquinante={inquinante} fonte={fonte} zone={zone} indice={indice} />}
        {tab === 'mappa' && <ConfrontoDomini mese={mese} inquinante={inquinante} fonte={fonte} fonteModellata={fonteModellata} zone={zone}
                         indice={indice} durata={durata} setDurata={setDurata} domini={{ ...domini, simulati: mostraSimulati }} scenario={scenario} />}
        {tab === 'fonti' && <ConfrontoFonti mese={mese} inquinante={inquinante} zona={focus} indice={indice} />}
        {tab === 'fonti' && <FontiSalute mese={mese} zona={focus} indice={indice} />}
        {tab === 'fonti' && <FontiCalore mese={mese} zona={focus} indice={indice} />}
        {tab === 'riepilogo' && mese && (
          <TabellaRiepilogo riepilogo={riepilogo.data} caricamento={riepilogo.isFetching} errore={riepilogo.error} ariaPrima={ariaPrima.data}
                            inquinante={inquinante} periodo={etichetta(riepilogo.data) || periodoEtichetta} periodoPrima={etichetta(ariaPrima.data)}
                            indice={indice} zone={zone} onAlterna={clicZona} mostraSimulati={mostraSimulati} filtroFonte={filtroFonte}
                            assistente={assistenteRiepilogo} />
        )}

        {tab === 'stagionalita' && <Stagionalita indice={indice} scenario={scenario} zona={zonaStagione} fonte={fonteStagione}
                                                 simulatiNellaSintesi={simulatiSintesi} ricoveri={domini.ricoveri} />}

        {tab === 'info' && <Informazioni inquinanti={inquinanti} sezione={sezioneInfo} />}

        </div>
        <div ref={setColonnaChat} className="colonna-assistente" />
        </div>

      </main>
    </div>
    </ChatProvider>
    </GuidaProvider>
  )
}

export default function App() {
  return (
    <TemaProvider>
      <AvvisoBackend>
        <Dashboard />
      </AvvisoBackend>
    </TemaProvider>
  )
}
