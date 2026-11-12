// Scheda della zona sulla carta (fase 2 della revisione, scelte di Matteo). Il 28/10/2026 era un cuore; dal 29/10/2026
// è una scheda arrotondata come le altre, appoggiata sulla carta a sinistra come un cartiglio, con il bordo d'inchiostro
// aperto nell'angolo in alto a destra: da lì escono le particelle del marchio. Le particelle sono i colori della mappa
// (Aria, Salubrità, Temperatura, Alberi, Suolo) più la Salute (eventi sanitari): scegliere una particella colora la
// carta e apre il dominio corrispondente nella scheda, e ogni particella dice sempre il dato di sintesi della zona.
// Le particelle stanno in colonna sul bordo destro, dall'alto, e il bordo resta aperto per tutta la colonna. In alto a
// sinistra l'occhio, che nasconde la scheda (si comprime fino a lasciare solo l'occhio chiuso), e il livello della carta.
// Aria: un valore per inquinante (la vista «Tutte» se c'è) e un solo giudizio, quello del D.Lgs. 155/2010 in vigore;
// OMS e UE compaiono solo quando sono più severi, gli esiti completi stanno nel tooltip (la tabella a tre colonne si
// tagliava a 1600 px). Calore: temperatura ERA5-Land e ARPA meteo, poi i fattori di mitigazione (chioma, suolo).
// Salute: decessi (distretto: totale dei mesi toccati dalla finestra e media giornaliera con '~'; comune: sempre N/D
// per la privacy), dimissioni della provincia e, se accesi, ricoveri, PS e ADI simulati col badge «Dato simulato, non
// reale». Le celle sono brevi (N/D, null): il perché è nel tooltip, la legenda completa nella tab Informazioni.

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { FONTE_ACCORPATA, type CellaMensile, type DettaglioDimissioni, type DettaglioSimulati, type DettaglioZona as Dettaglio, type InfoInquinante, type SalubritaInquinante, type SalubritaZona, type SaluteMappa } from '../api/client'
import { etichettaGiornoCompleto, etichettaMese, numero, numeroIntero, percentuale } from '../lib/formato'
import { bandaQuadro, coloreBanda, descriviEsito, ETICHETTA_BANDA, ETICHETTA_QUADRO, ORDINE_BANDA, QUADRI, type Quadro } from '../lib/salubrita'
import { eDistretto, nomeZona, type IndiceTerritorio } from '../stato/dati'
import { coloreZona, MAX_ZONE, type ZonaScelta } from '../stato/zone'
import { BadgeModellato, BadgeSimulato, ComeLeggere, Errore, Pallino, PallinoBanda, StatoDato, Valore } from './comuni'
import { IconaAlberi, IconaAria, IconaCalore, IconaOcchio, IconaPiu, IconaSalubrita, IconaSalute, IconaSpunta, IconaSuolo } from './Icone'
import type { Livello, ModoMappa } from './MappaZone'
import { SegmentiAnimati } from './SegmentiAnimati'

/** "max" se la fonte pubblica il massimo giornaliero invece della media (ARPA per NO2, O3, SO2, CO). */
const eMassimo = (statistica: string | null | undefined) => !!statistica && !statistica.startsWith('media')

/** N/D con il motivo nel tooltip: la forma unica di ogni dato mancante del pannello. */
const ND = ({ motivo }: { motivo?: string | null }) => <Valore valore={null} stato="NO_DATA" nota={motivo} />

// ---------------------------------------------------------------- forma

/** Bordo d'inchiostro, in px, e raggio della scheda (lo stesso di tutte le schede, --raggio). */
const TRATTO = 2.5
const RAGGIO = 18

type Dominio = 'aria' | 'calore' | 'salute'

/** Le particelle in colonna sul bordo destro, dall'angolo in alto in giù, tutte come «Aria» (29/10/2026, scelta di
 *  Matteo): stesso diametro, centro poco dentro il bordo. Ognuna è una vista colore della mappa. */
const PARTICELLE: { id: ModoMappa; nome: string; dominio: Dominio; Icona: () => ReactNode }[] = [
  { id: 'valore', nome: 'Aria', dominio: 'aria', Icona: IconaAria },
  { id: 'salubrita', nome: 'Salubrità', dominio: 'aria', Icona: IconaSalubrita },
  { id: 'temperatura', nome: 'Temperatura', dominio: 'calore', Icona: IconaCalore },
  { id: 'alberi', nome: 'Alberi', dominio: 'calore', Icona: IconaAlberi },
  { id: 'suolo', nome: 'Suolo', dominio: 'calore', Icona: IconaSuolo },
  { id: 'salute', nome: 'Salute', dominio: 'salute', Icona: IconaSalute },
]
/** Colonna delle particelle, in px: diametro, rientro del centro dal bordo destro, centro della prima dal lato alto, passo. */
const COLONNA = { diametro: 38, rientro: 6, primo: 6, passo: 44 }
/** Dove finisce la colonna: il bordo resta aperto fin qui sul lato destro, e la scheda non è mai più corta. */
const FINE_COLONNA = COLONNA.primo + (PARTICELLE.length - 1) * COLONNA.passo + COLONNA.diametro / 2 + 10
/** Apertura sul lato alto: fino a poco prima della prima particella. */
const APERTURA_ALTO = COLONNA.rientro + COLONNA.diametro / 2 + 6

/** Bordo della scheda larga `w` e alta `h`, aperto in alto a destra per tutta la colonna delle particelle: parte dal
 *  lato destro sotto l'ultima particella, gira in senso orario per la base, il lato sinistro e il lato alto, e si ferma
 *  prima della prima particella. */
function bordoAperto(w: number, h: number) {
  const o = TRATTO / 2
  const r = RAGGIO - o
  const n = (v: number) => v.toFixed(1)
  return `M${n(w - o)},${n(Math.min(FINE_COLONNA, h - o - r))} V${n(h - o - r)} A${r},${r} 0 0 1 ${n(w - o - r)},${n(h - o)}`
    + ` H${n(o + r)} A${r},${r} 0 0 1 ${n(o)},${n(h - o - r)} V${n(o + r)} A${r},${r} 0 0 1 ${n(o + r)},${n(o)} H${n(w - APERTURA_ALTO)}`
}

// ---------------------------------------------------------------- aria

/** Banda di salubrità come pallino, la parola nel tooltip (29/10/2026). `cella` = nella tabella, — se non confrontabile. */
function BandaPill({ banda, titolo, cella = false }: { banda: SalubritaZona['banda']; titolo?: string; cella?: boolean }) {
  if (cella && banda === 'non_confrontabile')
    return <span className="banda-nc" title={titolo ?? 'statistica del dato non confrontabile con questo limite'}>—</span>
  return <PallinoBanda banda={banda} titolo={titolo ? `${ETICHETTA_BANDA[banda]}. ${titolo}` : undefined} />
}

const QUADRO_BREVE: Record<Quadro, string> = { dlgs_155_2010: 'D.Lgs.', oms_2021: 'OMS', ue_2024_2881: 'UE ’30' }

/** Giudizio di un inquinante: la banda del D.Lgs. 155/2010 (la norma in vigore) e, sotto, OMS e UE solo se più severi.
 *  Nel tooltip gli esiti dei tre quadri, con statistica, limite e fonte. */
function Giudizio({ sal }: { sal: SalubritaInquinante | undefined }) {
  if (!sal) return <BandaPill banda="non_confrontabile" cella />
  const vigente = bandaQuadro(sal, 'dlgs_155_2010')
  const titolo = QUADRI.map((q) => {
    const esiti = sal.esiti.filter((e) => e.quadro === q)
    return `${ETICHETTA_QUADRO[q]}${q === 'ue_2024_2881' ? ' (limiti dal 2030)' : ''}: ${esiti.length ? esiti.map(descriviEsito).join('; ') : 'non confrontabile'}`
  }).join('\n')
  const severi = (['oms_2021', 'ue_2024_2881'] as Quadro[])
    .map((q) => ({ q, banda: bandaQuadro(sal, q) }))
    .filter((x) => ORDINE_BANDA[x.banda] > ORDINE_BANDA[vigente])
  return (
    <span className="giudizio" title={`D.Lgs. 155/2010: ${ETICHETTA_BANDA[vigente]}
${sal.esiti.length ? titolo : (sal.nota ?? titolo)}`}>
      <BandaPill banda={vigente} cella />
      {severi.length > 0 && (
        <small className="giudizio-severi">
          {/* i pallini separano le voci: niente virgola (finiva staccata dal testo per lo spazio del flex) */}
          {severi.map((x) => (
            <span key={x.q}><Pallino colore={coloreBanda(x.banda)} />{QUADRO_BREVE[x.q]}<span className="sr-only"> {ETICHETTA_BANDA[x.banda]}</span></span>
          ))}
        </small>
      )}
    </span>
  )
}

function DominioAria({ dettaglio, inquinanti, inquinanteScelto, senzaStazioni, distretto }: {
  dettaglio: Dettaglio
  inquinanti: InfoInquinante[]
  inquinanteScelto: string
  senzaStazioni: boolean
  distretto: boolean
}) {
  const presenti = new Set(dettaglio.inquinanti)
  const riferimento = inquinanti.filter((i) => i.riferimento && presenti.has(i.id))
  // un solo valore per inquinante: la vista «Tutte» se c'è, altrimenti la prima fonte. Le fonti separate restano
  // nella tab «Fonti a confronto»
  const fonte = dettaglio.aria.find((f) => f.fonte === FONTE_ACCORPATA) ?? dettaglio.aria[0]
  const tutte = fonte?.fonte === FONTE_ACCORPATA
  return (
    <>
      <h3 className="pannello-titolo">
        Aria
        {fonte && <small>{tutte ? 'media delle fonti concordi' : `fonte ${fonte.fonte}`}{fonte.modellata && ', modellata'}</small>}
      </h3>
      {senzaStazioni && (
        <p className="avviso-zona">
          <BadgeModellato />
          <span>Nessuna stazione fisica {distretto ? 'nel distretto' : 'nel comune'}, di nessuna fonte: l'unico dato è CAMS, modellato.</span>
        </p>
      )}
      {!fonte ? <p><ND motivo={dettaglio.aria_motivo ?? 'nessun dataset aria per la finestra'} /></p> : (
        <table className="tabella tabella-dettaglio tabella-scheda">
          <thead>
            <tr>
              <th scope="col"><span className="sr-only">Inquinante</span></th>
              <th scope="col" className="num">Valore{fonte.modellata && <> <BadgeModellato dim={14} /></>}</th>
              <th scope="col" title="Banda rispetto al D.Lgs. 155/2010, la norma italiana in vigore. Sotto, OMS 2021 e direttiva UE 2024/2881 (dal 2030) quando sono più severi">
                D.Lgs. 155/2010
              </th>
            </tr>
          </thead>
          <tbody>
            {riferimento.map((inq) => {
              const cella = fonte.celle[inq.id]
              const stat = fonte.statistiche[inq.id]
              return (
                <tr key={inq.id} className={inq.id === inquinanteScelto ? 'attivo' : ''}>
                  <th scope="row" title={inq.descrizione ?? undefined}>{inq.id}<small>{inq.unita}</small></th>
                  <td className="num">
                    {cella ? <Valore valore={cella.valore} stato={cella.stato} nota={cella.nota} />
                      : <ND motivo={`${fonte.fonte} non pubblica ${inq.id}`} />}
                    {cella?.stato === 'VALORE' && eMassimo(stat) && <sup className="statistica" title={`${fonte.fonte} pubblica il ${stat}`}>max</sup>}
                  </td>
                  <td><Giudizio sal={dettaglio.salubrita?.per_inquinante.find((x) => x.inquinante === inq.id)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </>
  )
}

// ---------------------------------------------------------------- calore

function DominioCalore({ dettaglio, copertura, suolo }: { dettaglio: Dettaglio; copertura: number | null | undefined; suolo: number | null | undefined }) {
  const cal = dettaglio.calore
  const tempo = (nome: string, cella: CellaMensile | null | undefined, motivo = 'statistica non in cache') => (
    <span key={nome} className="t-voce">
      <small>{nome}</small>
      {cella ? <Valore valore={cella.valore} stato={cella.stato} nota={cella.nota} /> : <ND motivo={motivo} />}
    </span>
  )
  const motivoArpa = 'nessun dato ARPA meteo scaricato per il periodo'
  return (
    <>
      <h3 className="pannello-titolo">Calore <small>temperatura dell'aria a 2 m</small></h3>
      {cal.stato === 'DISPONIBILE' ? (
        <ul className="elenco-dominio">
          <li className="riga-temperature">
            <span title={cal.fonte ?? undefined}>ERA5-Land*</span>
            <span className="t-valori">{tempo('med', cal.media)}{tempo('max', cal.massima)}{tempo('min', cal.minima)}<small>{cal.unita}</small></span>
          </li>
          <li className="riga-temperature">
            <span title={cal.arpa_fonte ?? undefined}>ARPA meteo</span>
            <span className="t-valori">
              {tempo('med', cal.arpa_media, motivoArpa)}{tempo('max', cal.arpa_massima, motivoArpa)}{tempo('min', cal.arpa_minima, motivoArpa)}
              <small>{cal.unita}</small>
            </span>
          </li>
        </ul>
      ) : (
        <ul className="elenco-dominio"><li><span>Temperatura</span><ND motivo={cal.motivo ?? 'temperatura non integrata'} /></li></ul>
      )}
      {/* fattori di mitigazione: dato statico dell'anagrafica, non segue la finestra */}
      <h4 className="scheda-sottotitolo">Mitigazione <small>dato statico, Copernicus CLMS</small></h4>
      <ul className="elenco-dominio">
        <li>
          <span>Chioma arborea<small className="nota-riga">Tree Cover Density 2024</small></span>
          {copertura != null ? <span className="dettaglio-numero">{numero(copertura)}%</span> : <ND motivo="copertura arborea non calcolata" />}
        </li>
        <li>
          <span>Suolo impermeabile<small className="nota-riga">Imperviousness Density 2018</small></span>
          {suolo != null ? <span className="dettaglio-numero">{numero(suolo)}%</span> : <ND motivo="suolo impermeabile non calcolato" />}
        </li>
      </ul>
    </>
  )
}

// ---------------------------------------------------------------- salute

const GRUPPI_RICOVERI_VISIBILI = ['respiratorio', 'circolatorio']

/** Dimissioni ospedaliere della provincia della zona (ISTAT HFA, 18/10/2026): dato annuale, solo informativo, accanto ai
 *  decessi. Il ~/giorno è il totale annuo diviso per i giorni dell'anno (convenzione «~»); vale anche per i comuni. */
function SezioneRicoveri({ dimissioni }: { dimissioni: DettaglioDimissioni }) {
  const riga = (v: DettaglioDimissioni['valori'][number]) => (
    <li key={v.gruppo}>
      <span title={v.etichetta}>{v.etichetta.replace('Malattie dell\'apparato ', '').replace('Malattie del sistema ', '').replace('Malattie ', '').replace(' (BPCO)', '')}</span>
      {v.stato === 'VALORE' && v.dimissioni != null ? (
        <span className="dettaglio-numero" title={`${dimissioni.nota ?? ''}. Tasso ISTAT ${v.tasso != null ? numero(v.tasso) : 'n/d'} per 10.000 abitanti.`}>
          {numeroIntero(v.dimissioni)}
          {v.media_giornaliera != null && <small>~{numero(v.media_giornaliera)}/giorno</small>}
        </span>
      ) : <Valore valore={null} stato={v.stato} nota={v.nota} />}
    </li>
  )
  return (
    <>
      <h4 className="scheda-sottotitolo" title={dimissioni.nota ?? undefined}>
        Ricoveri <small>provincia di {dimissioni.denominazione_provincia}{dimissioni.anno != null && `, ${dimissioni.anno}`}, dato annuale</small>
      </h4>
      {dimissioni.stato === 'VALORE'
        ? <ul className="elenco-dominio">{dimissioni.valori.filter((v) => GRUPPI_RICOVERI_VISIBILI.includes(v.gruppo)).map(riga)}</ul>
        : <p><ND motivo={dimissioni.nota} /></p>}
    </>
  )
}

/** Ricoveri, PS e ADI simulati della zona nella finestra (comune o distretto = somma dei comuni): per 100.000 residenti al
 *  giorno, così zone diverse si confrontano, con il totale della finestra accanto. ADI: assistiti in carico, accessi in PS,
 *  quota a bassa urgenza e quota di ritorni entro 30 giorni (gli indicatori per organizzare telefonate e visite).
 *  Discreti (fase 1.2, 28/10/2026): campitura leggera e badge, non più il giallo pieno. */
function SezioneSimulati({ simulati }: { simulati: DettaglioSimulati }) {
  const v = (id: string) => simulati.valori.find((x) => x.indicatore === id)
  const tasso = (id: string, nome: string) => {
    const x = v(id)
    return (
      <li key={id}>
        <span>{nome}</span>
        {x?.per_100k != null ? (
          <span className="dettaglio-numero" title={`${numeroIntero(x.totale)} nella finestra (${numero(x.al_giorno)} al giorno). ${simulati.nota ?? ''}`}>
            {numero(x.per_100k)}
            <small>{numeroIntero(x.totale)} in tutto</small>
          </span>
        ) : <ND motivo={simulati.nota} />}
      </li>
    )
  }
  const assistiti = v('adi_assistiti')
  return (
    <div className="blocco-simulato scheda-simulati">
      <h4 className="scheda-sottotitolo">Ricoveri, PS e ADI <BadgeSimulato /></h4>
      {simulati.stato !== 'VALORE' ? <p><ND motivo={simulati.nota} /></p> : (
        <>
          <p className="nota-grafico">Per 100.000 residenti al giorno, scenario «{simulati.scenario}»; accanto, il totale della finestra.</p>
          <ul className="elenco-dominio elenco-compatto">
            {tasso('ricoveri_respiratori', 'Ricoveri respiratori')}
            {tasso('ricoveri_circolatori', 'Ricoveri circolatori')}
            {tasso('ps_accessi', 'Accessi in PS')}
            {tasso('ps_respiratori', 'PS respiratori')}
            {tasso('ps_cardiovascolari', 'PS cardiovascolari')}
          </ul>
          <p className="nota-grafico">Assistiti in ADI (assistenza domiciliare)</p>
          <ul className="elenco-dominio elenco-compatto">
            <li>
              <span>In carico</span>
              <span className="dettaglio-numero" title="assistiti in ADI (over 65) in media nella finestra">{numeroIntero(assistiti?.totale)}</span>
            </li>
            {tasso('adi_accessi_ps', 'Accessi in PS')}
            <li>
              <span>A bassa urgenza</span>
              <span className="dettaglio-numero" title="quota degli accessi in PS degli assistiti ADI a bassa urgenza al triage: potenzialmente gestibili a domicilio">
                {percentuale(simulati.quota_bassa_urgenza)}
              </span>
            </li>
            <li>
              <span>Ritorni entro 30 giorni</span>
              <span className="dettaglio-numero" title="quota degli accessi ADI di chi era già passato dal PS nei 30 giorni prima">
                {percentuale(simulati.quota_ritorni)}
              </span>
            </li>
          </ul>
        </>
      )}
    </div>
  )
}

function DominioSalute({ dettaglio, mostraSimulati }: { dettaglio: Dettaglio; mostraSimulati: boolean }) {
  const s = dettaglio.salute
  const periodo = s.mesi.length ? (s.mesi.length === 1 ? etichettaMese(s.mesi[0]) : `${etichettaMese(s.mesi[0])} → ${etichettaMese(s.mesi[s.mesi.length - 1])}`) : ''
  return (
    <>
      <h3 className="pannello-titolo">Salute <small>dati reali, poi simulati</small></h3>
      <ul className="elenco-dominio">
        <li>
          <span>Decessi, tutte le cause{periodo && <small className="nota-riga">{periodo}</small>}</span>
          {s.stato === 'VALORE' && s.valore != null && s.media_giornaliera != null ? (
            <span className="dettaglio-numero" title={`${s.nota ?? ''}. Media giornaliera = totale / ${s.giorni} giorni: valore derivato, solo per leggerlo.`}>
              {numeroIntero(s.valore)}
              <small>~{numero(s.media_giornaliera)}/giorno</small>
            </span>
          ) : <Valore valore={null} stato={s.stato} nota={s.nota} />}
        </li>
      </ul>
      {dettaglio.dimissioni && <SezioneRicoveri dimissioni={dettaglio.dimissioni} />}
      {mostraSimulati && dettaglio.simulati && <SezioneSimulati simulati={dettaglio.simulati} />}
    </>
  )
}

// legenda breve in fondo alla scheda: i segni degli stati con la loro parola, la legenda completa in Informazioni
const segnoModellato = <><BadgeModellato dim={15} /> modellato</>
const segnoNd = <><StatoDato stato="NO_DATA" dim={15} /> non disponibile</>
const LEGENDA: Record<Dominio, ReactNode> = {
  aria: <>{segnoModellato}; max = massimo giornaliero; — = non confrontabile con il limite; <StatoDato stato="NULL" dim={15} /> non utilizzabile; {segnoNd}.</>,
  calore: <>{segnoModellato} (ERA5-Land, griglia di 9 km); {segnoNd}.</>,
  salute: <>~ = media giornaliera derivata, solo per leggerla; {segnoNd} o non mostrabile (privacy); <BadgeSimulato dim={15} /> simulato, non reale.</>,
}

// ---------------------------------------------------------------- scheda

export default function DettaglioZona({ id: scelto, dettaglio, errore, caricamento = false, inquinanti, inquinanteScelto, indice, zone,
  mostraSimulati, modo, onModo, livello, onLivello, salute, aperta = true, onAlterna, onRiserva, onConfronto }: {
  id: string | null
  dettaglio: Dettaglio | null | undefined
  errore: unknown
  caricamento?: boolean
  inquinanti: InfoInquinante[]
  inquinanteScelto: string
  indice: IndiceTerritorio | null
  zone: ZonaScelta[]
  mostraSimulati: boolean
  /** Vista colore della mappa: è la particella scelta e decide il dominio aperto nella scheda. */
  modo: ModoMappa
  onModo: (m: ModoMappa) => void
  livello: Livello
  onLivello: (l: Livello) => void
  /** Eventi sanitari di tutte le zone (vista «Salute»): il dato di sintesi della particella Salute. */
  salute: SaluteMappa | null | undefined
  /** false = scheda nascosta: con l'occhio chiuso la scheda si comprime e resta solo l'occhio. */
  aperta?: boolean
  onAlterna: () => void
  /** Larghezza della carta coperta dalla scheda, in px dal bordo sinistro (0 se la scheda non sta sopra la carta). */
  onRiserva: (px: number) => void
  /** Aggiunge o toglie la zona dal confronto: l'alternativa al doppio clic sulla carta, anche da tastiera (fase 6). */
  onConfronto: (id: string) => void
}) {
  const base = useId()
  const dominio = PARTICELLE.find((pt) => pt.id === modo)?.dominio ?? 'aria'

  // il bordo si disegna sulle misure reali: la larghezza la decide il CSS, l'altezza il contenuto
  const radice = useRef<HTMLDivElement>(null)
  const [misura, setMisura] = useState<{ w: number; h: number } | null>(null)
  // mentre la scheda si comprime o si apre la carta non si reinquadra a ogni passo: lo fa una volta, sulla misura finale
  const apertaRif = useRef(aperta)
  apertaRif.current = aperta
  const larghezzaAperta = useRef(0)
  const inMovimento = useRef(false)
  // nelle finestre strette la scheda scende sotto la carta (app.css): allora non copre nulla
  const sopraLaCarta = (r: HTMLElement) => getComputedStyle(r).gridRowStart === '1'
  useLayoutEffect(() => {
    const r = radice.current
    if (!r) return
    const aggiorna = () => {
      const w = r.offsetWidth
      const h = r.offsetHeight
      setMisura((m) => (m && m.w === w && m.h === h ? m : { w, h }))
      if (inMovimento.current) return
      if (apertaRif.current) larghezzaAperta.current = w
      onRiserva(apertaRif.current && sopraLaCarta(r) ? r.offsetLeft + w : 0)
    }
    aggiorna()
    const osservatore = new ResizeObserver(aggiorna)
    osservatore.observe(r)
    return () => { osservatore.disconnect(); onRiserva(0) }
  }, [onRiserva])
  const primaVolta = useRef(true)
  useLayoutEffect(() => {
    const r = radice.current
    if (primaVolta.current || !r) { primaVolta.current = false; return }
    inMovimento.current = true
    onRiserva(aperta && sopraLaCarta(r) ? r.offsetLeft + larghezzaAperta.current : 0)
    // fine dell'animazione di compressione (.45 s in app.css), anche quando il sistema chiede meno movimento
    const fine = setTimeout(() => { inMovimento.current = false }, 600)
    return () => clearTimeout(fine)
  }, [aperta, onRiserva])

  // durante il caricamento si mostra per intero la zona dei dati arrivati (titolo compreso), non la nuova scelta
  const id = dettaglio?.zona.id ?? scelto
  const distretto = id ? eDistretto(id) : false
  const scelta = id ? zone.find((z) => z.id === id) : undefined
  const d = !id ? undefined : distretto ? indice?.distretti.get(id) : indice?.distretti.get(indice?.comuni.get(id)?.id_distretto ?? '')
  const c = !id || distretto ? null : indice?.comuni.get(id)
  // flag statico di /api/territorio: nessuna stazione fisica di nessuna fonte nella zona
  const zonaTer = distretto ? d : c
  const nStazioni = zonaTer?.stazioni_fisiche ?? 0

  // dato di sintesi di ogni particella: sempre visibile, anche quando la particella non è scelta
  const fonte = dettaglio?.aria.find((f) => f.fonte === FONTE_ACCORPATA) ?? dettaglio?.aria[0]
  const cellaAria = fonte?.celle[inquinanteScelto]
  const unitaAria = inquinanti.find((i) => i.id === inquinanteScelto)?.unita ?? ''
  const sal = dettaglio?.salubrita
  const cal = dettaglio?.calore
  const tmedia = cal?.stato === 'DISPONIBILE' && cal.media?.stato === 'VALORE' ? cal.media.valore : null
  const eventi = id ? (distretto ? salute?.distretti[id] : salute?.comuni[id]) : undefined
  const attesa = { testo: '…', aiuto: 'in caricamento' }
  const nd = (aiuto: string) => ({ testo: <StatoDato stato="NO_DATA" nota={aiuto} dim={16} />, aiuto })
  const percento = (v: number | null | undefined, cosa: string, aiuto: string) =>
    (v != null ? { testo: `${numero(v)}% ${cosa}`, aiuto } : nd(`${cosa} non calcolata per la zona`))
  const sintesi: Record<ModoMappa, { testo: ReactNode; aiuto: string }> = !id
    ? { valore: nd('nessuna zona scelta'), salubrita: nd('nessuna zona scelta'), temperatura: nd('nessuna zona scelta'),
        alberi: nd('nessuna zona scelta'), suolo: nd('nessuna zona scelta'), salute: nd('nessuna zona scelta') }
    : {
      valore: !dettaglio ? attesa : cellaAria?.stato === 'VALORE' && cellaAria.valore != null
        ? { testo: <>{inquinanteScelto} {numero(cellaAria.valore)} {unitaAria}{fonte?.modellata && <> <BadgeModellato dim={16} /></>}</>,
            aiuto: `Media della finestra, ${fonte?.fonte === FONTE_ACCORPATA ? 'media delle fonti concordi' : `fonte ${fonte?.fonte}`}` }
        : nd(cellaAria?.nota ?? dettaglio.aria_motivo ?? `nessun valore di ${inquinanteScelto}`),
      salubrita: !dettaglio ? attesa : sal
        ? { testo: <><PallinoBanda banda={sal.banda} />{sal.inquinante_peggiore ? `peggiore ${sal.inquinante_peggiore}` : ETICHETTA_BANDA[sal.banda]}</>,
            aiuto: `${ETICHETTA_BANDA[sal.banda]} rispetto al D.Lgs. 155/2010, dato dall'inquinante peggiore${sal.nota ? `. ${sal.nota}` : ''}` }
        : nd(dettaglio.aria_motivo ?? 'nessun giudizio di salubrità per la finestra'),
      temperatura: !dettaglio ? attesa : tmedia != null
        ? { testo: <>T media {numero(tmedia)} {cal?.unita ?? '°C'} <BadgeModellato dim={16} /></>, aiuto: 'Media della temperatura giornaliera della finestra, ERA5-Land (modellato)' }
        : nd(cal?.motivo ?? 'temperatura non disponibile'),
      alberi: percento(zonaTer?.copertura_arborea_pct, 'chioma', 'Copertura arborea media della zona, CLMS Tree Cover Density 2024'),
      suolo: percento(zonaTer?.suolo_impermeabile_pct, 'suolo sigillato', 'Suolo impermeabile medio della zona, CLMS Imperviousness Density 2018'),
      salute: salute === undefined ? attesa : eventi?.stato === 'VALORE' && eventi.valore != null
        ? { testo: <>{numero(eventi.valore)} per 100.000/g <BadgeSimulato dim={16} /></>,
            aiuto: `Decessi + ricoveri + accessi in PS per 100.000 residenti al giorno${distretto ? '' : ', valore del distretto (privacy)'}: ricoveri e PS sono simulati` }
        : nd(eventi?.nota ?? 'eventi sanitari non disponibili per la finestra'),
    }

  const tasti = (e: KeyboardEvent<HTMLDivElement>) => {
    const passo = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
    if (!passo) return
    e.preventDefault()
    const nuovo = PARTICELLE[(PARTICELLE.findIndex((pt) => pt.id === modo) + passo + PARTICELLE.length) % PARTICELLE.length].id
    onModo(nuovo)
    document.getElementById(`${base}-${nuovo}`)?.focus()
  }

  // il contenuto resta montato anche a scheda chiusa: così la scheda si comprime sopra di esso invece di svuotarsi di colpo
  let corpo: ReactNode = null
  if (!id) corpo =<p className="scheda-invito">Clicca un distretto o un comune sulla carta: qui compaiono la sua aria, il suo calore e la sua salute.</p>
  else if (errore) corpo = <Errore errore={errore} />
  // primo caricamento: nessun dato precedente da mostrare, e N/D direbbe che i dati non esistono
  else if (!dettaglio) corpo = <p className="testo-stato">Dati della zona in caricamento…</p>
  else corpo = (
    <div className="scheda-dominio" role="tabpanel" id={`${base}-pannello`} aria-labelledby={`${base}-${modo}`}>
      {dominio === 'aria' && <DominioAria dettaglio={dettaglio} inquinanti={inquinanti} inquinanteScelto={inquinanteScelto}
                                          senzaStazioni={!!zonaTer?.senza_stazioni} distretto={distretto} />}
      {dominio === 'calore' && <DominioCalore dettaglio={dettaglio} copertura={zonaTer?.copertura_arborea_pct} suolo={zonaTer?.suolo_impermeabile_pct} />}
      {dominio === 'salute' && <DominioSalute dettaglio={dettaglio} mostraSimulati={mostraSimulati} />}
    </div>
  )

  return (
    <div className={`scheda-zona${aperta ? '' : ' chiusa'}`} id="scheda-zona" ref={radice} aria-busy={caricamento || undefined}>
      {misura && (
        <svg className="scheda-bordo" width={misura.w} height={misura.h} aria-hidden="true" focusable="false">
          <path d={bordoAperto(misura.w, misura.h)} strokeWidth={TRATTO} />
        </svg>
      )}

      {/* colonna sul bordo destro, dall'alto, tutte allineate come la prima; a scheda chiusa spariscono con lei */}
      <div className="scheda-particelle" role="tablist" aria-label="Colore della carta e dominio della scheda" aria-orientation="vertical"
           onKeyDown={tasti} inert={!aperta}>
        {PARTICELLE.map((pt, i) => (
          <button key={pt.id} type="button" role="tab" id={`${base}-${pt.id}`} aria-selected={modo === pt.id}
                  aria-controls={`${base}-pannello`} tabIndex={modo === pt.id ? 0 : -1}
                  className={`particella${modo === pt.id ? ' scelta' : ''}`} title={sintesi[pt.id].aiuto}
                  style={{ left: `calc(100% - ${COLONNA.rientro + COLONNA.diametro / 2}px)`, top: COLONNA.primo + i * COLONNA.passo - COLONNA.diametro / 2,
                           ['--d' as string]: `${COLONNA.diametro}px` }}
                  onClick={() => onModo(pt.id)}>
            <span className="particella-segno"><pt.Icona /></span>
            <span className="particella-testo">
              <b>{pt.nome}</b>
              <span>{sintesi[pt.id].testo}</span>
            </span>
          </button>
        ))}
      </div>

      {/* in alto a sinistra l'occhio (mostra o nasconde la scheda) e il livello della carta */}
      <div className="scheda-comandi">
        <button type="button" className="scheda-occhio" onClick={onAlterna} aria-expanded={aperta} aria-controls={`${base}-contenuto`}
                aria-label={aperta ? 'Nascondi la scheda della zona' : 'Mostra la scheda della zona'}
                title={aperta ? 'Nascondi la scheda della zona e libera la carta' : 'Mostra la scheda della zona'}>
          <IconaOcchio chiuso={!aperta} />
        </button>
        <SegmentiAnimati classe="segmenti-piccoli scheda-livello" etichetta="Livello della carta" valore={livello} onScegli={onLivello}
                         opzioni={[{ id: 'distretti', testo: 'Distretti' }, { id: 'comuni', testo: 'Comuni' }]} />
      </div>

      <div className="scheda-contenuto" id={`${base}-contenuto`} inert={!aperta}>
        <header className="scheda-testa">
          <h2 className="scheda-nome">
            {scelta && <Pallino colore={coloreZona(scelta.slot)} />}
            {id ? nomeZona(indice, id) : 'Nessuna zona in primo piano'}
          </h2>
          {id && (
            <p className="card-sottotitolo">
              {distretto
                ? `Distretto socio-sanitario, ASL di ${indice?.province.find((p) => p.id_provincia === d?.id_provincia)?.denominazione ?? '—'}`
                : `Comune del distretto ${nomeZona(indice, d?.id_distretto ?? '')}`}
              {c?.nota && <>. {c.nota}</>}
            </p>
          )}
          {dettaglio && (
            <p className="dettaglio-periodo">
              {etichettaGiornoCompleto(dettaglio.da)} → {etichettaGiornoCompleto(dettaglio.a)}: dati aria in {dettaglio.giorni_coperti} giorni su {dettaglio.giorni}
            </p>
          )}
          {/* confronto dalla scheda (fase 6, 29/10/2026, scelta di Matteo): un solo posto per l'azione, al posto del
              pulsante grande sotto la carta; il doppio clic sulla zona resta come scorciatoia */}
          {id && (
            <button type="button" className={`pillola pillola-piccola scheda-confronto${scelta ? ' pillola-attiva' : ''}`} aria-pressed={!!scelta}
                    disabled={!scelta && zone.length >= MAX_ZONE} onClick={() => onConfronto(id)}
                    title={scelta ? 'Togli la zona dal confronto (anche con un doppio clic sulla carta)'
                      : zone.length >= MAX_ZONE ? `Confronto pieno: al più ${MAX_ZONE} zone, togline una dalla barra laterale`
                      : 'Aggiungi la zona al confronto (anche con un doppio clic sulla carta)'}>
              <span className="con-icona">{scelta ? <><IconaSpunta />Nel confronto</> : <><IconaPiu />Aggiungi al confronto</>}</span>
            </button>
          )}
          {caricamento && <div className="barra-caricamento" role="progressbar" aria-label="Caricamento dei dati della zona" />}
        </header>

        {id && (
          <dl className="identikit">
            <div><dt>Residenti</dt><dd>{numeroIntero(zonaTer?.residenti)}</dd></div>
            <div><dt>{distretto ? 'Comuni' : 'Distretto'}</dt><dd>{distretto ? (d?.comuni.length ?? '—') : (d?.sede ?? '—')}</dd></div>
            <div><dt>Stazioni fisiche</dt><dd>{nStazioni || 'nessuna'}</dd></div>
          </dl>
        )}

        {corpo}

        {id && (
          <footer className="scheda-piede">
            <p>{LEGENDA[dominio]}</p>
            <ComeLeggere sezione="scheda" />
          </footer>
        )}
      </div>
    </div>
  )
}
