// Tab «Stagionalità» (16/10/2026): i 12 mesi dell'anno a confronto su aria, calore, decessi e salute simulata, per il
// Salento o un distretto, su tutto l'archivio (la finestra della barra temporale non ne cambia i numeri). I numeri arrivano già calcolati da
// /api/stagionalita (localhost/server/dati_stagionalita.py); il metodo sta nella tab Informazioni. Esplorativo, non
// causale.
// Fase 5 della revisione (29/10/2026, scelte di Matteo): un solo «mese peggiore» (temi critici), rango 1 = peggiore,
// calendario e griglia fusi in una tabella riempita nella rampa del dominio, medie dal 2024.
// Pagina come sommario (29/10/2026): il consiglio in cima
// è il sommario e ogni suo punto porta a un blocco sotto, nell'ordine Periodi critici → 12 mesi a confronto → anno su
// anno (si ripete ogni anno?) → il mese anno per anno → Cosa sta cambiando (barre degli scarti con la fascia di
// stabilità). Testo schematico: anni come intervallo, unità una volta sola, niente diciture lunghe ripetute.
// Dal 02/11/2026 (scelte di Matteo): la testata fissa con la barra temporale è la stessa della Mappa e porta i filtri
// della tab (zona, fonte aria, simulati), il primo blocco tiene solo ONE e la guida; ordine Quando intervenire → Periodi
// critici → Cosa sta cambiando → 12 mesi a confronto (col mese anno per anno nello stesso blocco, tre sintesi aria,
// calore e salute che si aprono) → anno su anno → Ricoveri. La finestra della testata non cambia i numeri della tab,
// che sono medie su tutto l'archivio.

import { useState, type ReactNode } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { FONTE_ACCORPATA, type ContestoAssistente, type Scenario, type AndamentoStagione, type CellaStagione, type MeseStagione, type RigaStagionalita, type Stagionalita as DatiStagionalita, type TemaCriticita } from '../api/client'
import { etichettaMese, numero } from '../lib/formato'
import { elenco, iniziale, intervalloAnni, MESI, MESI_LUNGHI, nomeIndicatore, periodoAnni, scarto, vaiA } from '../lib/stagionalita'
import type { CardAssistente } from '../stato/assistente'
import { nomeZona, useStagionalita, type IndiceTerritorio } from '../stato/dati'
import { useTema } from '../stato/token'
import { BadgeModellato, BadgeSimulato, Card, ComeLeggere, Errore, Pallino, ScaricaCsv, SegnoLimite, StatoDato, Valore, type AssistenteCard } from './comuni'
import { IconaApri, IconaAria, IconaAumento, IconaCalo, IconaStabile, iconaDominio } from './Icone'
import Ricoveri from './Ricoveri'
import ConsiglioStagionalita from './ConsiglioStagionalita'
import CriticitaAnno from './CriticitaAnno'
import { MenuSelezione, SceltaScenario } from './Filtri'
import { assi, Legenda, TabellaSerie, TooltipSerie, type Riga, type Serie } from './grafici'
import { InterruttoreAnimato, SegmentiAnimati } from './SegmentiAnimati'

/** Icona del dominio di una riga. */
function IconaRiga({ id, dominio, dim = 15 }: { id: string; dominio?: string | null; dim?: number }) {
  const Icona = iconaDominio(dominio) || iconaDominio(id)
  return Icona ? <Icona dim={dim} /> : null
}

const FONTI = [FONTE_ACCORPATA, 'ARPA', 'OpenAQ', 'EEA', 'CAMS']
const ANNI_COVID = new Set(['2020', '2021', '2022'])
const UNITA_SIMULATI = 'per 100.000 residenti al giorno'
/** Sotto il nome di un tema simulato: cosa conta (le unità stanno una volta sola nell'intestazione del gruppo). */
const SOTTO: Record<string, string> = { pronto_soccorso: 'accessi', adi_accessi_ps: 'accessi in PS', ricoveri_respiratori: 'ricoveri' }
const rango = (r: number) => numero(r).replace(',0', '')

const CLASSE: Record<AndamentoStagione['classe'], { icona: ReactNode; testo: string }> = {
  in_aumento: { icona: <IconaAumento />, testo: 'in aumento' },
  in_calo: { icona: <IconaCalo />, testo: 'in calo' },
  stabile: { icona: <IconaStabile />, testo: 'stabile' },
  storico_insufficiente: { icona: null, testo: 'senza storico' },
  nessun_dato: { icona: null, testo: 'nessun dato' },
}

/** Intestazione del gruppo delle righe simulate: la beuta e l'unità una volta sola. */
function GruppoSimulati({ colonne }: { colonne: number }) {
  return (
    <tr className="riga-gruppo riga-simulata">
      <th scope="rowgroup" colSpan={colonne}><span className="nome-dominio"><BadgeSimulato dim={16} />Simulati, {UNITA_SIMULATI}</span></th>
    </tr>
  )
}

/** Intensità del riempimento dal rango (1 = peggiore = pieno) sui mesi che hanno un rango. */
function intensita(r: number | null | undefined, n: number) {
  if (r == null) return 0
  return n < 2 ? 100 : Math.round(8 + ((n - r) / (n - 1)) * 92)
}

/** Peso dei numeri della tabella (01/11/2026, Matteo): tutti a 17 px (nota + 5), dal più leggero al più pesante di Manrope Variable. */
const PESO_MIN = 200
const PESO_MAX = 800

/** Peso di un numero rispetto alla sua riga: lineare sul valore fra il minimo e il massimo dei 12 mesi. Sulla riga dei
 *  ranghi (aria) cresce col peggioramento (rango 1 = più pesante), come il riempimento. */
function peso(r: RigaStagionalita, m: MeseStagione) {
  let t = 0
  if (m.valore != null && r.formato === 'rango') {
    const n = r.clima.filter((x) => x.rango != null).length
    t = m.rango == null || n < 2 ? 0 : (n - m.rango) / (n - 1)
  } else if (m.valore != null) {
    const valori = r.clima.flatMap((x) => (x.valore == null ? [] : [x.valore]))
    const min = Math.min(...valori), max = Math.max(...valori)
    t = max > min ? (m.valore - min) / (max - min) : 0
  }
  return Math.round((PESO_MIN + t * (PESO_MAX - PESO_MIN)) / 50) * 50
}

/** Assistente di una card della Stagionalità (01/11/2026): descrizione e numeri della card, dagli stessi dati di
 *  /api/stagionalita. Zona, fonte, scenario e interruttore dei simulati nel contesto fanno ripartire la chat quando
 *  cambiano; il Salento è la lista vuota. */
function assistenteStagione(dati: DatiStagionalita, card: CardAssistente, titolo: string, extra: Partial<ContestoAssistente> = {}): AssistenteCard {
  return {
    card, titolo,
    descrizione: `${dati.denominazione}, media ${periodoAnni(dati.anni_confronto)}, aria da ${dati.fonte === FONTE_ACCORPATA ? 'tutte le fonti' : dati.fonte}`,
    contesto: {
      fonte: dati.fonte, zone: dati.zona?.id ? [dati.zona.id] : [], scenario: dati.scenario as Scenario | null,
      simulati_nella_sintesi: dati.simulati_nella_sintesi, ...extra,
    },
  }
}

// --------------------------------------------------------------------------------------- 12 mesi e un mese anno per anno

/** I tre domini delle tabelle (02/11/2026, scelta di Matteo): una riga di sintesi ciascuno, che si apre sulle righe di
 *  dettaglio. La sintesi dell'aria è il rango medio dei 5 inquinanti, del calore la temperatura massima, della salute i
 *  decessi, che sono reali: i simulati restano righe di dettaglio, mai dentro un numero di sintesi. */
type IdGruppo = 'aria' | 'calore' | 'salute'
type Gruppo = { id: IdGruppo; nome: string; capo: string; sotto: string }
const GRUPPI: Gruppo[] = [
  { id: 'aria', nome: 'Aria', capo: 'aria', sotto: 'rango medio dei 5 inquinanti' },
  { id: 'calore', nome: 'Calore', capo: 'calore', sotto: 'temperatura massima, °C' },
  { id: 'salute', nome: 'Salute', capo: 'decessi', sotto: 'decessi al giorno' },
]

type RigaTabella = { r: RigaStagionalita; tema?: TemaCriticita; gruppo?: Gruppo; figlia?: boolean }

/** Righe di un dominio: quella di sintesi e, sotto, quelle di dettaglio. */
function righeGruppo(dati: DatiStagionalita, g: Gruppo) {
  const delDominio = dati.righe.filter((r) => r.dominio === g.id)
  const capo = delDominio.find((r) => r.id === g.capo) ?? delDominio[0]
  return { capo, figlie: delDominio.filter((r) => r !== capo) }
}

/** Le righe di un dominio nell'ordine della tabella: la sintesi e, se il dominio è aperto, il dettaglio. */
function righeVisibili(dati: DatiStagionalita, g: Gruppo, aperto: boolean, filtro: (r: RigaStagionalita) => boolean = () => true) {
  const temaDi = new Map((dati.criticita?.temi ?? []).map((t) => [t.id, t]))
  const { capo, figlie } = righeGruppo(dati, g)
  const dettaglio = figlie.filter(filtro)
  return {
    capo: capo ? ({ r: capo, tema: temaDi.get(capo.id), gruppo: g } as RigaTabella) : null,
    figlie: aperto ? dettaglio.map((r) => ({ r, tema: temaDi.get(r.id), figlia: true }) as RigaTabella) : [],
    dettaglio,
  }
}

function classeRiga({ r, figlia }: RigaTabella) {
  return `dominio-${r.dominio}${r.simulata ? ' riga-simulata' : ''}${figlia ? ' riga-dettaglio' : ''}`
}

/** Peso di un numero fra il minimo e il massimo della sua riga. */
function pesoTra(v: number | null | undefined, valori: number[]) {
  if (v == null || !valori.length) return PESO_MIN
  const min = Math.min(...valori), max = Math.max(...valori)
  const t = max > min ? (v - min) / (max - min) : 0
  return Math.round((PESO_MIN + t * (PESO_MAX - PESO_MIN)) / 50) * 50
}

function titoloCella(r: RigaStagionalita, m: MeseStagione, n: number, critico: boolean) {
  const nome = iniziale(MESI_LUNGHI[m.mese - 1])
  if (m.valore == null) return `${nome}: N/D, nessun mese completo con un valore${r.motivo ? ` (${r.motivo})` : ''}`
  return [
    r.formato === 'rango' ? `${nome}: rango medio dei 5 inquinanti ${numero(m.valore)}`
      : `${nome}: ${numero(m.valore)} ${r.unita ?? ''} (media ${intervalloAnni(m.anni ?? [])})`,
    m.rango != null ? `rango ${rango(m.rango)} su ${n} (1 = peggiore)` : null,
    critico ? 'fra i 3 mesi peggiori del tema: critico' : null,
    m.limite_superato ? `limite D.Lgs. 155/2010 toccato: ${m.limiti_nota ?? ''}` : null,
    m.limite_superato === null && r.dominio === 'aria' && r.formato !== 'rango' ? 'nessun limite del D.Lgs. confrontabile con la statistica del dato' : null,
    'clic: il mese anno per anno',
  ].filter(Boolean).join('\n')
}

function CellaMese({ riga, m, n, onMese }: { riga: RigaTabella; m: MeseStagione; n: number; onMese: (m: number) => void }) {
  const { r, tema, figlia } = riga
  const critico = !!tema?.entra && (tema.mesi_critici ?? []).includes(m.mese)
  const testo = m.valore == null ? null : r.formato === 'rango' ? (m.rango != null ? rango(m.rango) : null) : numero(m.valore)
  return (
    <td className={`cella-mese${critico ? ' cella-critica' : ''}${testo == null ? ' cella-vuota' : ''}`}
        style={{ ['--i' as string]: `${intensita(m.rango, n)}%`, fontWeight: peso(r, m) }} title={titoloCella(r, m, n, critico)} onClick={() => onMese(m.mese)}>
      {testo ?? <StatoDato stato="NO_DATA" nota="nessun mese completo con un valore" dim={16} />}
      {figlia && m.limite_superato && <SegnoLimite titolo={`Limite D.Lgs. 155/2010 toccato: ${m.limiti_nota ?? ''}`} />}
      {critico && <span className="sr-only">, critico</span>}
    </td>
  )
}

/** Nome della riga: il dominio per la sintesi (con la punta che apre il dettaglio, se ce n'è), il tema o l'indicatore
 *  per il dettaglio. */
function IntestazioneRiga({ riga, aperto, onApri }: { riga: RigaTabella; aperto?: boolean; onApri?: () => void }) {
  const { r, tema, gruppo } = riga
  const escluso = !!tema && tema.disponibile && !tema.entra && r.simulata
  const nome = (
    <span className="nome-dominio">
      {gruppo && <IconaRiga id={r.id} dominio={r.dominio} />}{gruppo?.nome ?? tema?.nome ?? r.etichetta}{r.modellata && <BadgeModellato dim={14} />}
      {escluso && <small className="testo-stato">fuori sintesi</small>}
    </span>
  )
  const sotto = gruppo ? gruppo.sotto : r.simulata ? SOTTO[r.id] : r.unita
  return (
    <th scope="row" title={r.nota ?? undefined}>
      <span className="cella-indicatore">
        {onApri ? (
          <button type="button" className="apri-righe" aria-expanded={aperto} onClick={onApri}
                  title={`${aperto ? 'Nascondi' : 'Mostra'} il dettaglio: ${gruppo?.id === 'aria' ? 'i 5 inquinanti' : 'i dati simulati'}`}>
            <IconaApri />{nome}
          </button>
        ) : <span className={gruppo ? 'senza-dettaglio' : undefined}>{nome}</span>}
        {sotto && <small>{sotto}</small>}
      </span>
    </th>
  )
}

function TabellaMesi({ dati, mese, onMese, aperti, onApri }: {
  dati: DatiStagionalita
  mese: number
  onMese: (m: number) => void
  aperti: Set<IdGruppo>
  onApri: (g: IdGruppo) => void
}) {
  const k = dati.criticita
  const riga = (x: RigaTabella, apribile = false) => {
    const n = x.r.clima.filter((m) => m.rango != null).length
    const g = x.gruppo
    return (
      <tr key={x.r.id} className={classeRiga(x)}>
        <IntestazioneRiga riga={x} aperto={!!g && aperti.has(g.id)} onApri={g && apribile ? () => onApri(g.id) : undefined} />
        {x.r.disponibile
          ? x.r.clima.map((m) => <CellaMese key={m.mese} riga={x} m={m} n={n} onMese={onMese} />)
          : <td colSpan={12} className="cella-nd"><StatoDato stato="NO_DATA" nota={x.r.motivo} /> {x.r.motivo}</td>}
        <td className="cella-peggiore">{x.r.mese_peggiore ? MESI_LUNGHI[x.r.mese_peggiore - 1] : '—'}</td>
      </tr>
    )
  }
  return (
    <div className="tabella-scorre">
      <table className="tabella tabella-mesi">
        <thead>
          <tr>
            <th scope="col">Dominio</th>
            {MESI.map((m, i) => (
              <th key={m} scope="col" className={`num${mese === i + 1 ? ' mese-scelto' : ''}`}>
                <button type="button" className="ordina" aria-pressed={mese === i + 1} onClick={() => onMese(i + 1)}
                        title={`${iniziale(MESI_LUNGHI[i])} anno per anno`}>{m}</button>
              </th>
            ))}
            <th scope="col">Peggiore</th>
          </tr>
        </thead>
        {GRUPPI.map((g) => {
          const { capo, figlie, dettaglio } = righeVisibili(dati, g, aperti.has(g.id))
          if (!capo) return null
          const primoSimulato = figlie.findIndex((x) => x.r.simulata)
          return (
            <tbody key={g.id} className="gruppo-righe">
              {riga(capo, dettaglio.length > 0)}
              {figlie.map((x, i) => [i === primoSimulato && <GruppoSimulati key="gruppo-simulati" colonne={14} />, riga(x)])}
            </tbody>
          )
        })}
        {k && (
          <tfoot>
            <tr>
              <th scope="row">
                <span className="cella-indicatore"><span>Temi critici</span><small>su {k.temi_contati}</small></span>
              </th>
              {k.mesi.map((m) => (
                <td key={m.mese} className="num"
                    title={m.conteggio ? `${iniziale(MESI_LUNGHI[m.mese - 1])}: fra i 3 mesi peggiori per ${m.conteggio} ${m.conteggio === 1 ? 'tema' : 'temi'} su ${k.temi_contati}` : undefined}>
                  {m.conteggio > 0 ? <span className={`conteggio-critico livello-${m.livello}`}>{m.conteggio}</span> : <span className="conteggio-zero">0</span>}
                </td>
              ))}
              <td className="cella-peggiore">{dati.peggiori[0] ? <strong>{MESI_LUNGHI[dati.peggiori[0] - 1]}</strong> : '—'}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

/** Variazione dell'ultimo anno completo del mese sulla media degli anni precedenti (stessa regola dell'andamento). */
function variazione(r: RigaStagionalita, celle: (CellaStagione | undefined)[], anni: string[]) {
  const validi = anni.map((a, i) => ({ a, c: celle[i] })).filter((x) => x.c?.stato === 'VALORE' && x.c.completo && x.c.valore != null)
  if (validi.length < 2) return null
  const ultimo = validi[validi.length - 1]
  const prima = validi.slice(0, -1)
  const media = prima.reduce((t, x) => t + (x.c!.valore as number), 0) / prima.length
  const delta = (ultimo.c!.valore as number) - media
  const assoluta = r.id === 'calore'
  const pct = media ? delta / media : null
  const classe = assoluta ? (delta > 1 ? 'in_aumento' : delta < -1 ? 'in_calo' : 'stabile')
    : pct == null ? 'stabile' : pct > 0.1 ? 'in_aumento' : pct < -0.1 ? 'in_calo' : 'stabile'
  return { anno: ultimo.a, contro: prima.map((x) => x.a), delta, pct, classe: classe as AndamentoStagione['classe'], assoluta }
}

/** Δ di una riga: icona e scarto, col confronto nel tooltip. */
function CellaDelta({ v }: { v: ReturnType<typeof variazione> }) {
  return (
    <td className="num" title={v ? `${v.anno} sulla media ${intervalloAnni(v.contro)}${v.contro.length < 2 ? ' (un solo anno: indicativo)' : ''}` : 'servono almeno due anni completi'}>
      {v ? (
        <span className={`delta-mese andamento-${v.classe}`}>
          {CLASSE[v.classe].icona}<span className="sr-only">{CLASSE[v.classe].testo} </span>
          {scarto(v.assoluta || v.pct == null ? v.delta : v.pct, v.assoluta || v.pct == null)}
        </span>
      ) : <span className="testo-stato">—</span>}
    </td>
  )
}

/** Sintesi di un dominio senza valori anno per anno (l'aria: il rango non esiste per un anno solo): quali indicatori di
 *  dettaglio salgono, scendono o restano stabili nell'ultimo anno completo del mese. */
function SintesiVariazioni({ righe, mese, confronto, k }: { righe: RigaStagionalita[]; mese: number; confronto: string[]; k: DatiStagionalita['criticita'] }) {
  const per = new Map<AndamentoStagione['classe'], string[]>()
  let rif: ReturnType<typeof variazione> = null
  for (const r of righe) {
    const v = variazione(r, confronto.map((a) => r.anni?.[a]?.[mese - 1]), confronto)
    if (!v) continue
    rif ??= v
    per.set(v.classe, [...(per.get(v.classe) ?? []), nomeIndicatore(r, k)])
  }
  if (!rif) return <span className="testo-stato">servono almeno due anni completi del mese</span>
  const voci: [AndamentoStagione['classe'], string][] = [['in_aumento', 'in aumento'], ['in_calo', 'in calo'], ['stabile', 'stabili']]
  return (
    <span className="sintesi-variazioni">
      <span className="testo-stato">{rif.anno} sulla media {intervalloAnni(rif.contro)}</span>
      {voci.filter(([c]) => per.has(c)).map(([c, testo]) => (
        <span key={c} className={`delta-mese andamento-${c}`}>{CLASSE[c].icona}{testo} <strong>{elenco(per.get(c)!)}</strong></span>
      ))}
    </span>
  )
}

function AnnoPerAnno({ dati, mese, aperti, onApri }: { dati: DatiStagionalita; mese: number; aperti: Set<IdGruppo>; onApri: (g: IdGruppo) => void }) {
  const k = dati.criticita
  const confronto = dati.anni_confronto.map(String)
  const anni = (dati.anni_storico?.length ? dati.anni_storico : dati.anni_confronto).map(String)
  const dentro = new Set(confronto)
  const nome = iniziale(MESI_LUNGHI[mese - 1])
  const critico = k?.mesi[mese - 1]
  // il blocco si apre sul mese peggiore dell'intero anno, non su quello della finestra della testata: lo dice (03/11/2026,
  // scelta di Matteo, che tiene la Stagionalità indipendente dalla finestra)
  const peggiore = dati.peggiori[0] === mese
  const conAnni = (r: RigaStagionalita) => Object.keys(r.anni ?? {}).length > 0

  /** Una riga coi valori dell'anno; `sintesi` = la riga di un dominio senza valori per anno, riassunta dal dettaglio. */
  const riga = (x: RigaTabella, apribile = false, sintesi?: RigaStagionalita[]) => {
    const g = x.gruppo
    const intestazione = <IntestazioneRiga riga={x} aperto={!!g && aperti.has(g.id)} onApri={g && apribile ? () => onApri(g.id) : undefined} />
    if (sintesi)
      return (
        <tr key={x.r.id} className={classeRiga(x)}>
          {intestazione}
          <td colSpan={anni.length + 1} className="cella-sintesi"><SintesiVariazioni righe={sintesi} mese={mese} confronto={confronto} k={k} /></td>
        </tr>
      )
    const celle = anni.map((a) => x.r.anni?.[a]?.[mese - 1])
    const valori = celle.flatMap((c) => (c?.stato === 'VALORE' && c.valore != null ? [c.valore] : []))
    return (
      <tr key={x.r.id} className={classeRiga(x)}>
        {intestazione}
        {celle.map((c, j) => {
          const parziale = c?.stato === 'VALORE' && !c.completo
          return (
            <td key={anni[j]} className={`cella-anno${dentro.has(anni[j]) ? '' : ' anno-storico'}${parziale ? ' cella-parziale' : ''}`}
                style={{ fontWeight: pesoTra(c?.stato === 'VALORE' ? c.valore : null, valori) }}
                title={[parziale ? 'mese incompleto' : null, dentro.has(anni[j]) ? null : 'fuori da medie e ranghi', ...(c?.limiti ?? [])].filter(Boolean).join('\n') || undefined}>
              {c ? <Valore valore={c.valore} stato={c.stato} nota={c.nota} /> : <StatoDato stato="NO_DATA" nota="nessun valore per questo anno" dim={16} />}
              {c?.limite_superato && <SegnoLimite titolo={(c.limiti_superati ?? []).join('\n') || undefined} />}
            </td>
          )
        })}
        <CellaDelta v={variazione(x.r, confronto.map((a) => x.r.anni?.[a]?.[mese - 1]), confronto)} />
      </tr>
    )
  }

  return (
    <section id="dettaglio-mese" className="anno-per-anno" aria-labelledby="titolo-dettaglio-mese">
      <header className="sezione-testa">
        <div>
          <h3 id="titolo-dettaglio-mese" className="sezione-titolo">{nome} anno per anno</h3>
          {(critico || peggiore) && (
            <p className="card-sottotitolo">
              {peggiore && <><strong>Il mese peggiore dell'intero anno</strong> (il picco del primo periodo critico), non il mese della finestra della testata. </>}
              {critico && `${critico.conteggio
                ? `Fra i 3 mesi peggiori per ${critico.conteggio} ${critico.conteggio === 1 ? 'tema' : 'temi'} su ${k!.temi_contati}`
                : 'Non è fra i mesi peggiori di nessun tema'}; `}clic su un altro mese della tabella per cambiarlo
            </p>
          )}
        </div>
        <ComeLeggere sezione="dettaglio-mese" />
      </header>
      <div className="tabella-scorre">
        <table className="tabella tabella-mesi tabella-anni">
          <thead>
            <tr>
              <th scope="col">Dominio</th>
              {anni.map((a) => <th key={a} scope="col" className={`num${dentro.has(a) ? '' : ' anno-storico'}`}
                                   title={dentro.has(a) ? undefined : 'fuori da medie e ranghi'}>{a}</th>)}
              <th scope="col" className="num" title="ultimo anno completo sulla media dei precedenti">Δ</th>
            </tr>
          </thead>
          {GRUPPI.map((g) => {
            const { capo, figlie, dettaglio } = righeVisibili(dati, g, aperti.has(g.id), conAnni)
            if (!capo) return null
            const primoSimulato = figlie.findIndex((x) => x.r.simulata)
            return (
              <tbody key={g.id} className="gruppo-righe">
                {riga(capo, dettaglio.length > 0, conAnni(capo.r) ? undefined : dettaglio)}
                {figlie.map((x, i) => [i === primoSimulato && <GruppoSimulati key="gruppo-simulati" colonne={anni.length + 2} />, riga(x)])}
              </tbody>
            )
          })}
        </table>
      </div>
    </section>
  )
}

function LegendaMesi({ storico }: { storico: string[] }) {
  return (
    <ul className="legenda-stati legenda-mesi">
      <li>
        <span className="scala-domini" aria-hidden="true"><i className="dominio-aria" /><i className="dominio-calore" /><i className="dominio-salute" /></span>
        dal mese migliore al peggiore (rango 1), nel colore del dominio
      </li>
      <li><i className="campione-critico" aria-hidden="true" /> critico: fra i 3 mesi peggiori del tema</li>
      <li><span className="campione-limite" aria-hidden="true"><SegnoLimite /></span> limite D.Lgs. 155/2010 toccato</li>
      {storico.length > 0 && <li><span className="campione-storico">{intervalloAnni(storico)}</span> fuori da medie e ranghi</li>}
      <li><span className="campione-parziale" aria-hidden="true">12,3</span> mese incompleto</li>
      <li><BadgeModellato dim={16} /> modellato</li>
      <li><BadgeSimulato dim={16} /> simulato</li>
    </ul>
  )
}

/** «12 mesi a confronto» e «il mese anno per anno» in un blocco solo (02/11/2026, scelta di Matteo): stesse righe, stesso
 *  stile, tre sintesi (aria, calore, salute) che si aprono insieme nelle due tabelle. */
function MesiAConfronto({ dati, mese, onMese, periodo, fonteAria }: {
  dati: DatiStagionalita
  mese: number
  onMese: (m: number) => void
  periodo: string
  fonteAria: string | null
}) {
  const [aperti, setAperti] = useState<Set<IdGruppo>>(() => new Set())
  const alterna = (g: IdGruppo) => setAperti((p) => {
    const n = new Set(p)
    if (n.has(g)) n.delete(g)
    else n.add(g)
    return n
  })
  const nome = iniziale(MESI_LUNGHI[mese - 1])
  const confronto = new Set(dati.anni_confronto.map(String))
  const storico = (dati.anni_storico ?? []).map(String).filter((a) => !confronto.has(a))
  return (
    <Card id="mesi-a-confronto" titolo="12 mesi a confronto" guida="mesi"
          assistente={assistenteStagione(dati, 'dettaglio_mese', `${nome} anno per anno`, { mese_dell_anno: mese })}
          sottotitolo={`Ogni dominio mese per mese, media ${periodo}; aria da ${fonteAria}. Clic su un mese: sotto, lo stesso mese anno per anno`}
          azioni={<ScaricaCsv onClick={() => esportaCsv(dati)} />}>
      <TabellaMesi dati={dati} mese={mese} onMese={onMese} aperti={aperti} onApri={alterna} />
      <AnnoPerAnno dati={dati} mese={mese} aperti={aperti} onApri={alterna} />
      <LegendaMesi storico={storico} />
    </Card>
  )
}

// --------------------------------------------------------------------------------------- anno su anno

/** Il mese peggiore (valore più alto) di ogni anno del confronto, sui soli mesi completi. */
function peggiorePerAnno(r: RigaStagionalita, anni: string[]) {
  return anni.flatMap((a) => {
    const celle = (r.anni?.[a] ?? []).map((c, i) => ({ c, mese: i + 1 })).filter(({ c }) => c.stato === 'VALORE' && c.completo && c.valore != null)
    if (!celle.length) return []
    const top = celle.reduce((x, y) => ((y.c.valore as number) > (x.c.valore as number) ? y : x))
    return [{ anno: a, mese: top.mese, fino: celle.length < 12 ? celle[celle.length - 1].mese : null }]
  })
}

/** Gruppi di mesi consecutivi di un periodo (dicembre–febbraio = [12] e [1, 2]), per le fasce sull'asse 1-12. */
function tratti(mesi: number[]) {
  const ordinati = [...mesi].sort((a, b) => a - b)
  const out: number[][] = []
  for (const m of ordinati) {
    const ultimo = out[out.length - 1]
    if (ultimo && m === ultimo[ultimo.length - 1] + 1) ultimo.push(m)
    else out.push([m])
  }
  return out
}

function AnnoSuAnno({ dati }: { dati: DatiStagionalita }) {
  const { token } = useTema()
  const k = dati.criticita
  const scegli = dati.righe.filter((r) => Object.keys(r.anni ?? {}).length > 0)
  const [id, setId] = useState('decessi')
  const r = scegli.find((x) => x.id === id) ?? scegli[0]
  if (!r) return null
  const confronto = new Set(dati.anni_confronto.map(String))
  const perAnno = r.anni ?? {}
  const anni = Object.keys(perAnno).sort()
  const colori = [token['zona-1'], token['zona-2'], token['zona-3'], token['zona-4']]
  // anni del confronto nei colori categoriali in ordine fisso; lo storico in grigio, COVID tratteggiato
  let c = 0
  const serie: Serie[] = anni.map((a) => confronto.has(a)
    ? { chiave: a, nome: a, colore: colori[c++ % colori.length] }
    : { chiave: a, nome: a, colore: token['testo-3'], tratteggio: ANNI_COVID.has(a) })
  const righe: Riga[] = MESI.map((m, i) => {
    const riga: Riga = { mese: m, n: i + 1 }
    for (const a of anni) {
      const cella = perAnno[a][i]
      riga[a] = cella.stato === 'VALORE' ? (cella.valore ?? null) : null
      riga[`${a}__stato`] = cella.stato
      riga[`${a}__nota`] = cella.nota ?? null
    }
    return riga
  })
  const serieRecenti = serie.filter((s) => confronto.has(s.chiave))
  const storico = anni.filter((a) => !confronto.has(a))
  const nome = nomeIndicatore(r, k)
  const unita = r.simulata ? UNITA_SIMULATI : r.unita
  // la lettura: il mese peggiore di ogni anno del confronto e se cade in un periodo critico
  const nelPeriodo = new Set((k?.periodi ?? []).flatMap((p) => p.mesi))
  const picchi = peggiorePerAnno(r, dati.anni_confronto.map(String))
  const dentro = picchi.filter((p) => nelPeriodo.has(p.mese)).length
  return (
    <Card id="anno-su-anno" icona={<IconaRiga id={r.id} dominio={r.dominio} dim={18} />} guida="anno-su-anno"
          assistente={assistenteStagione(dati, 'anno_su_anno', `${nome} anno su anno`, { indicatore: r.id })}
          titolo={<>{nome} anno su anno {r.modellata && <BadgeModellato />}{r.simulata && <BadgeSimulato />}</>}
          sottotitolo={`Il periodo critico torna ogni anno? Una linea per anno${unita ? `, in ${unita}` : ''}; le fasce grigie sono i periodi critici`}
          azioni={
            <MenuSelezione classe="menu-selezione-card" etichetta="Indicatore del grafico" valore={r.id} onScegli={setId}
                           voci={scegli.map((x) => ({ id: x.id, testo: nomeIndicatore(x, k) }))} />
          }
          tabella={<TabellaSerie righe={righe} chiaveX="mese" intestazioneX="Mese" serie={serie} unita={unita} etichettaX={(m) => MESI_LUNGHI[MESI.indexOf(m)] ?? m} />}>
      {picchi.length > 0 && (
        <p className="lettura-grafico">
          {/* raggruppato per mese, con gli anni come intervallo: «gennaio dal 2024 al 2026», non «2024 gennaio; 2025 gennaio…» */}
          <strong>Mese peggiore</strong>{' '}
          {elenco([...picchi.reduce((g, p) => g.set(p.mese, [...(g.get(p.mese) ?? []), p.anno]), new Map<number, string[]>())]
            .map(([m, anniMese]) => `${MESI_LUNGHI[m - 1]} ${periodoAnni(anniMese)}`))}
          {picchi.some((p) => p.fino) && <small> ({picchi.filter((p) => p.fino).map((p) => `${p.anno} con dati fino a ${MESI_LUNGHI[p.fino! - 1]}`).join(', ')})</small>}.
          {nelPeriodo.size > 0 && <> {dentro === picchi.length ? 'Cade sempre' : dentro === 0 ? 'Non cade mai' : `Cade ${dentro} ${dentro === 1 ? 'volta' : 'volte'} su ${picchi.length}`} in un periodo critico.</>}
        </p>
      )}
      <Legenda serie={serieRecenti.length > 1 ? serieRecenti : serie} righe={righe} />
      {storico.length > 0 && (
        <p className="nota-grafico">
          <Pallino colore={token['testo-3']} /> storico {intervalloAnni(storico)}, fuori da medie e ranghi
          {storico.some((a) => ANNI_COVID.has(a)) && '; tratteggiati gli anni COVID 2020-2022'}
        </p>
      )}
      <div className="grafico" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={righe} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={token.griglia} />
            {(k?.periodi ?? []).flatMap((p, i) => tratti(p.mesi).map((t) => (
              <ReferenceArea key={`${p.etichetta}-${t[0]}`} x1={t[0] - 0.5} x2={t[t.length - 1] + 0.5} fill={token['card-2']} fillOpacity={1}
                             strokeOpacity={0} ifOverflow="hidden"
                             label={{ value: String(i + 1), position: 'insideTop', fill: token['testo-2'], fontSize: 12, fontWeight: 700 }} />
            )))}
            <XAxis dataKey="n" type="number" domain={[0.5, 12.5]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                   tickFormatter={(n: number) => MESI[n - 1] ?? ''} allowDecimals={false} {...assi(token['testo-3'], token.asse)} />
            <YAxis width={48} {...assi(token['testo-3'], token.asse)} axisLine={false} domain={['auto', 'auto']} />
            <Tooltip cursor={{ stroke: token.asse, strokeWidth: 1 }} isAnimationActive={false}
                     content={(q) => <TooltipSerie active={q.active} label={q.label as number} righe={righe} chiaveX="n"
                                                   serie={[...serie].reverse()} unita={unita} etichettaX={(x) => MESI_LUNGHI[Number(x) - 1] ?? x} />} />
            {serie.map((s) => (
              <Line key={s.chiave} type="monotone" dataKey={s.chiave} name={s.nome} stroke={s.colore}
                    strokeWidth={confronto.has(s.chiave) ? 2 : 1} strokeOpacity={confronto.has(s.chiave) ? 1 : 0.4} strokeDasharray={s.tratteggio ? '4 3' : undefined}
                    dot={confronto.has(s.chiave) ? { r: 3, strokeWidth: 0, fill: s.colore } : false}
                    activeDot={{ r: 4.5, stroke: token.card, strokeWidth: 2 }} connectNulls={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

// --------------------------------------------------------------------------------------- cosa sta cambiando

/** Una barra dello scarto dal solito: da zero verso destra (più alto) o sinistra (più basso), su una scala simmetrica,
 *  con la fascia di stabilità (±10%, ±1 °C) dietro. Fuori dalla fascia la barra è d'inchiostro, dentro è grafite chiara. */
function Traccia({ valore, massimo, soglia }: { valore: number; massimo: number; soglia: number }) {
  const x = (v: number) => 50 + (Math.max(-massimo, Math.min(massimo, v)) / massimo) * 50
  const da = Math.min(50, x(valore))
  const a = Math.max(50, x(valore))
  return (
    <div className="traccia-scarto" aria-hidden="true">
      <span className="fascia-scarto" style={{ left: `${x(-soglia)}%`, width: `${x(soglia) - x(-soglia)}%` }} />
      <span className="zero-scarto" />
      <span className={`barra-scarto ${valore >= 0 ? 'barra-su' : 'barra-giu'}`} style={{ left: `${da}%`, width: `${Math.max(a - da, 0.6)}%` }} />
    </div>
  )
}

/** Le tacche della scala: estremi, fascia e zero. */
function Scala({ massimo, soglia, formato }: { massimo: number; soglia: number; formato: (v: number) => string }) {
  const x = (v: number) => 50 + (v / massimo) * 50
  return (
    <div className="scala-scarto" aria-hidden="true">
      {[-massimo, -soglia, 0, soglia, massimo].map((v) => (
        <span key={v} style={{ left: `${x(v)}%` }} className={v === -massimo ? 'tacca-inizio' : v === massimo ? 'tacca-fine' : undefined}>{formato(v)}</span>
      ))}
    </div>
  )
}

const pctTacca = (v: number) => (v === 0 ? '0' : `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`)
const gradiTacca = (v: number) => (v === 0 ? '0' : `${v > 0 ? '+' : '−'}${numero(Math.abs(v)).replace(',0', '')} °C`)

function RigaScarto({ r, k, massimo, soglia }: { r: RigaStagionalita; k: DatiStagionalita['criticita']; massimo: number; soglia: number }) {
  const a = r.andamento!
  const gradi = r.id === 'calore'
  const v = gradi ? (a.delta ?? 0) : (a.delta_percentuale ?? 0)
  const cambiato = a.classe === 'in_aumento' || a.classe === 'in_calo'
  const titolo = `${etichettaMese(a.mese_riferimento!)}: ${numero(a.valore)} ${r.unita ?? ''} contro ${numero(a.media_anni_precedenti)} (media ${intervalloAnni(a.anni_precedenti ?? [])})${a.indicativo ? '; un solo anno di storico: indicativo' : ''}`
  return (
    <tr className={`${cambiato ? 'scarto-cambiato' : 'scarto-stabile'}${r.simulata ? ' riga-simulata' : ''}`} title={titolo}>
      <th scope="row">
        <span className="nome-dominio">{nomeIndicatore(r, k)}{r.modellata && <BadgeModellato dim={14} />}{r.simulata && <BadgeSimulato dim={16} />}</span>
      </th>
      <td className="cella-traccia"><Traccia valore={v} massimo={massimo} soglia={soglia} /></td>
      <td className="num"><b>{scarto(v, gradi)}</b></td>
      <td className="classe-scarto">{CLASSE[a.classe].testo}{a.indicativo && <small>, indicativo</small>}</td>
    </tr>
  )
}

function Cambiamenti({ dati }: { dati: DatiStagionalita }) {
  const k = dati.criticita
  const con = dati.righe.filter((r) => r.andamento?.mese_riferimento && r.andamento.delta != null
    && ['in_aumento', 'in_calo', 'stabile'].includes(r.andamento.classe))
  const senza = dati.righe.filter((r) => r.andamento && ['storico_insufficiente', 'nessun_dato'].includes(r.andamento.classe))
  const perMese = new Map<string, RigaStagionalita[]>()
  for (const r of con) perMese.set(r.andamento!.mese_riferimento!, [...(perMese.get(r.andamento!.mese_riferimento!) ?? []), r])
  // un dominio indietro di più del mese in corso: lo si dice, col motivo (es. i decessi ISTAT arrivano mesi dopo)
  const corrente = dati.oggi.slice(0, 7)
  const indietro = new Map<string, RigaStagionalita>()
  for (const r of dati.righe) {
    const vuoti = r.andamento?.mesi_senza_dati ?? []
    const chiave = r.id.startsWith('aria:') ? 'aria' : r.simulata ? 'simulati' : r.id
    if (vuoti.some((m) => m !== corrente) && !indietro.has(chiave)) indietro.set(chiave, r)
  }
  const nomeDominio: Record<string, string> = { aria: 'Aria', simulati: 'PS, ADI e ricoveri', calore: 'Temperatura', decessi: 'Decessi' }
  // una scala sola per tutti i gruppi (percentuali e gradi), così le barre di mesi diversi si confrontano a occhio
  const maxPct = Math.max(0.2, Math.ceil(Math.max(0, ...con.filter((r) => r.id !== 'calore').map((r) => Math.abs(r.andamento!.delta_percentuale ?? 0))) * 10) / 10)
  const maxGradi = Math.max(3, Math.ceil(Math.max(0, ...con.filter((r) => r.id === 'calore').map((r) => Math.abs(r.andamento!.delta ?? 0)))))
  return (
    <Card id="cambiamenti" titolo="Cosa sta cambiando" guida="cambiamenti"
          assistente={assistenteStagione(dati, 'cambiamenti', 'Cosa sta cambiando')}
          sottotitolo="L'ultimo mese completo contro lo stesso mese degli anni precedenti: oltre la fascia grigia è un cambiamento da tenere nel piano della prossima stagione">
      {[...perMese.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([mese, voci]) => {
        const pct = voci.filter((r) => r.id !== 'calore').sort((a, b) => (b.andamento!.delta_percentuale ?? 0) - (a.andamento!.delta_percentuale ?? 0))
        const temp = voci.find((r) => r.id === 'calore')
        const precedenti = intervalloAnni(voci.flatMap((r) => r.andamento!.anni_precedenti ?? []))
        return (
          <section key={mese} className="gruppo-scarti">
            <h3 className="sotto-titolo">{iniziale(etichettaMese(mese))} contro {MESI_LUNGHI[Number(mese.slice(5)) - 1]} {precedenti}</h3>
            <table className="tabella tabella-compatta tabella-scarti">
              <colgroup><col className="col-nome" /><col /><col className="col-scarto" /><col className="col-classe" /></colgroup>
              <thead>
                <tr>
                  <th scope="col">Indicatore</th>
                  <th scope="col" className="cella-traccia">{pct.length > 0 && <Scala massimo={maxPct} soglia={0.1} formato={pctTacca} />}</th>
                  <th scope="col" className="num">Scarto</th>
                  <th scope="col"><span className="sr-only">Lettura</span></th>
                </tr>
              </thead>
              {pct.length > 0 && <tbody>{pct.map((r) => <RigaScarto key={r.id} r={r} k={k} massimo={maxPct} soglia={0.1} />)}</tbody>}
              {temp && (
                <tbody className="gruppo-gradi">
                  <tr className="riga-scala"><th scope="rowgroup"><small>In gradi</small></th><td className="cella-traccia"><Scala massimo={maxGradi} soglia={1} formato={gradiTacca} /></td><td /><td /></tr>
                  <RigaScarto r={temp} k={k} massimo={maxGradi} soglia={1} />
                </tbody>
              )}
            </table>
          </section>
        )
      })}
      {!perMese.size && <p className="testo-stato">Nessun indicatore con un mese completo da confrontare.</p>}
      <ul className="legenda-stati legenda-scarti">
        <li><i className="campione-fascia" aria-hidden="true" /> stabile: entro ±10% (±1 °C per la temperatura)</li>
        <li><i className="campione-barra" aria-hidden="true" /> fuori dalla fascia: in aumento o in calo</li>
      </ul>
      {(indietro.size > 0 || senza.length > 0) && (
        <ul className="note-scarti">
          {[...indietro.entries()].map(([chiave, r]) => (
            <li key={chiave}>
              <StatoDato stato="NO_DATA" nota={r.andamento?.motivo_senza_dati} dim={14} />{' '}
              <strong>{nomeDominio[chiave] ?? r.etichetta}</strong>: ultimo mese completo {etichettaMese(r.andamento!.mese_riferimento ?? '')}
              {r.andamento?.motivo_senza_dati && <>; {r.andamento.motivo_senza_dati.split(':')[0]}</>}
            </li>
          ))}
          {senza.length > 0 && <li>Senza confronto: {elenco(senza.map((r) => nomeIndicatore(r, k)))}.</li>}
        </ul>
      )}
    </Card>
  )
}

// --------------------------------------------------------------------------------------- esportazione

function csv(righe: (string | number | null | undefined)[][]) {
  return righe.map((r) => r.map((v) => (v == null ? '' : /[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(';')).join('\n')
}

/** CSV in formato lungo: una riga per indicatore × anno (o «media») × mese, con stato, rango (1 = peggiore), mese
 *  critico e limiti. */
function esportaCsv(dati: DatiStagionalita) {
  const critici = new Map((dati.criticita?.temi ?? []).filter((t) => t.entra).map((t) => [t.id, new Set(t.mesi_critici ?? [])]))
  const testa = ['zona', 'fonte_aria', 'indicatore', 'simulato', 'unita', 'anno', 'mese', 'valore', 'stato', 'completo', 'rango_1_peggiore', 'critico', 'limite_superato', 'nota']
  const corpo: (string | number | null | undefined)[][] = []
  for (const r of dati.righe) {
    const sim = r.simulata ? `si, non reale (scenario ${dati.scenario ?? '—'})` : 'no'
    const crit = critici.get(r.id)
    for (const m of r.clima)
      corpo.push([dati.denominazione, dati.fonte, r.etichetta, sim, r.unita, 'media', m.mese, m.valore, m.valore != null ? 'VALORE' : 'NO_DATA', null, m.rango,
                  crit ? (crit.has(m.mese) ? 'si' : 'no') : null, m.limite_superato == null ? null : m.limite_superato ? 'si' : 'no', m.limiti_nota ?? (r.disponibile ? null : r.motivo)])
    for (const [a, celle] of Object.entries(r.anni ?? {}))
      celle.forEach((c, i) => corpo.push([dati.denominazione, dati.fonte, r.etichetta, sim, r.unita, a, i + 1, c.valore, c.stato, c.completo ? 'si' : 'no', null, null,
                                          c.limite_superato == null ? null : c.limite_superato ? 'si' : 'no', c.nota]))
  }
  const blob = new Blob([`﻿${csv([testa, ...corpo])}`], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `onehealth_stagionalita_${dati.zona?.id ?? 'SALENTO'}_${dati.fonte}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

// --------------------------------------------------------------------------------------- tab

/** Filtri della tab (02/11/2026, scelta di Matteo): nella testata fissa, come l'inquinante per la Mappa, non più nel
 *  primo blocco. Lo scenario è lo stesso della pagina: cambiarlo qui lo cambia anche in mappa, pannello e riepilogo. */
export function FiltriStagionalita({ indice, zona, setZona, fonte, setFonte, scenario, setScenario, simulatiNellaSintesi, setSimulatiNellaSintesi }: {
  indice: IndiceTerritorio | null
  zona: string
  setZona: (z: string) => void
  fonte: string
  setFonte: (f: string) => void
  scenario: Scenario
  setScenario: (s: Scenario) => void
  simulatiNellaSintesi: boolean
  setSimulatiNellaSintesi: (v: boolean) => void
}) {
  const province = indice?.province ?? []
  // 11/11/2026 (richiesta di Matteo, testata su una riga): «Salento (tutti)», e al posto dei titoli «Fonte aria» e
  // «Simulati» le icone (aria e beuta), col nome nel tooltip e per i lettori di schermo. Nelle testate strette la fonte
  // passa dai segmenti al menu (classi stretta-N di BarraTemporale)
  const titoloFonte = (f: string) => (f === FONTE_ACCORPATA ? 'Media delle fonti concordi; CAMS dove non ci sono stazioni' : undefined)
  return (
    <div className="filtri-stagionalita">
      <div className="filtro filtro-zona">
        <span className="filtro-nome">Zona</span>
        <div className="filtro-controlli">
          <MenuSelezione etichetta="Zona" valore={zona} onScegli={setZona}
                         voci={[
                           { id: 'SALENTO', testo: 'Salento (tutti)' },
                           ...province.flatMap((p) => p.distretti.map((d) => ({
                             id: d.id_distretto, testo: nomeZona(indice, d.id_distretto), gruppo: p.denominazione ?? p.id_provincia,
                           }))),
                         ]} />
        </div>
      </div>
      <div className="filtro filtro-fonte-stagione">
        <span className="filtro-nome filtro-nome-icona" title="Fonte dei dati dell'aria">
          <IconaAria /><span className="sr-only">Fonte aria</span>
        </span>
        <SegmentiAnimati classe="fonte-segmenti" etichetta="Fonte dei dati dell'aria" valore={fonte} onScegli={setFonte}
                         opzioni={FONTI.map((f) => ({ id: f, testo: f === FONTE_ACCORPATA ? 'Tutte' : f, titolo: titoloFonte(f) }))} />
        <MenuSelezione classe="fonte-menu" etichetta="Fonte dei dati dell'aria" valore={fonte} onScegli={setFonte}
                       voci={FONTI.map((f) => ({ id: f, testo: f === FONTE_ACCORPATA ? 'Tutte' : f }))} />
      </div>
      <div className="filtro filtro-simulato">
        <span className="filtro-nome filtro-nome-icona"><BadgeSimulato dim={20} /><span className="sr-only">Simulati</span></span>
        <SceltaScenario scenario={scenario} setScenario={setScenario} classe="" />
        <InterruttoreAnimato etichetta="Dati simulati nella sintesi" attivo={simulatiNellaSintesi} onCambia={() => setSimulatiNellaSintesi(!simulatiNellaSintesi)}
                             testo="nella sintesi" titolo={simulatiNellaSintesi
                               ? 'PS, ADI e ricoveri simulati contano fra i temi critici: clic per toglierli e avere periodi e consiglio sui soli dati reali e modellati'
                               : 'PS, ADI e ricoveri simulati sono esclusi dai temi critici: clic per includerli'} />
      </div>
    </div>
  )
}

export default function Stagionalita({ indice, scenario, zona, fonte, simulatiNellaSintesi, ricoveri }: {
  indice: IndiceTerritorio | null
  scenario: Scenario
  zona: string
  fonte: string
  simulatiNellaSintesi: boolean
  /** Il blocco dei ricoveri in fondo (voce «Ricoveri» dei dati della finestra, nella testata). */
  ricoveri: boolean
}) {
  const q = useStagionalita(zona, fonte, scenario, simulatiNellaSintesi, true)
  const dati = q.data
  const da_preparare = dati?.mesi_da_preparare ?? []
  // mese del dettaglio anno per anno: di default il mese peggiore (il picco del primo periodo critico)
  const [scelto, setScelto] = useState<number | null>(null)
  const mese = scelto ?? dati?.peggiori[0] ?? new Date().getMonth() + 1
  const scegli = (m: number) => { setScelto(m); vaiA('dettaglio-mese') }

  const nomeArea = zona === 'SALENTO' ? 'Salento' : nomeZona(indice, zona)
  const fonteAria = dati ? (dati.fonte === FONTE_ACCORPATA ? 'tutte le fonti' : dati.fonte) : null
  const anni = dati ? periodoAnni(dati.anni_confronto) : ''
  return (
    <div className="stagionalita">
      <Card id="stagionalita" caricamento={q.isFetching} guida="consiglio" className="card-consiglio"
            assistente={dati ? assistenteStagione(dati, 'consiglio', `Quando intervenire nel ${nomeArea}`) : undefined}
            titolo={`Quando intervenire nel ${nomeArea}`}
            sottotitolo={dati ? `Media ${anni}; aria da ${fonteAria}` : undefined}>
        {q.isError ? <Errore errore={q.error} /> : !dati ? <p className="testo-stato">Stagionalità in caricamento…</p> : (
          <>
            {da_preparare.length > 0 && (
              <p className="avviso-modellato" role="status">
                {da_preparare.length} {da_preparare.length === 1 ? "mese d'aria non è ancora preparato" : "mesi d'aria non sono ancora preparati"} per
                questa tab ({da_preparare.map(etichettaMese).join(', ')}): restano fuori da medie e ranghi finché l'archivio non si aggiorna.
              </p>
            )}
            {dati.criticita
              ? <ConsiglioStagionalita k={dati.criticita} righe={dati.righe} area={nomeArea} onMese={setScelto} />
              : <p className="testo-stato">I periodi critici non sono disponibili per questa zona.</p>}
          </>
        )}
      </Card>
      {dati?.criticita && (
        <Card id="periodi" titolo="Periodi critici" guida="periodi"
              sottotitolo="Perché questi mesi: per ogni tema il mese peggiore del periodo, lo scarto dalla media dell'anno e il rango (1 = peggiore)">
          <CriticitaAnno k={dati.criticita} onMese={scegli} />
        </Card>
      )}
      {dati && <Cambiamenti dati={dati} />}
      {dati && <MesiAConfronto dati={dati} mese={mese} onMese={scegli} periodo={anni} fonteAria={fonteAria} />}
      {dati && <AnnoSuAnno dati={dati} />}
      {ricoveri && <Ricoveri zona={zona} indice={indice} />}
    </div>
  )
}
