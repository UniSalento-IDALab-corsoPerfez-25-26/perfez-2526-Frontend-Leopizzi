// Numeri di testa, tutti letti dalle risposte dell'API (nessuna stima nostra). Passo 4 anti-slop (19/10/2026, scelte di
// Matteo): non più cinque tessere identiche con la prima scura e il numero lime, ma una sola scheda con il dato
// principale grande a sinistra e tre numeri di contesto più piccoli a destra, separati da filetti, tutto neutro.
// Tolta la tessera «Giorni coperti dal dataset aria», che ripeteva il resoconto della barra temporale. Numeri in
// Manrope leggero con cifre tabulari; un dato mancante è «N/D» in corpo normale, col motivo sotto.
// Quinta tessera (25/10/2026, scelta di Matteo): accessi in PS **simulati** del Salento, col badge «Dato simulato, non
// reale», così non si legge come gli altri numeri, che sono tutti reali o modellati. Dal 28/10/2026 (simulati discreti)
// su campitura leggera invece del giallo pieno, e senza campitura quando è N/D. La scheda sta sotto la carta. Dal
// 29/10/2026 ogni etichetta porta l'icona del suo dominio, il simulato è la beuta senza scritta e un dato mancante è il
// segno di divieto, col motivo sotto e nel tooltip.
// Dal 02/11/2026 (scelta di Matteo) i numeri sono più pesanti e le note sotto sono nascoste: le apre per tutte le
// colonne insieme la freccia in fondo alla scheda (una riga in più per colonna).
// Sintesi della finestra (02/11/2026, scelta di Matteo): numeri di testa e classifica delle zone in una scheda sola,
// divisa per dominio. A sinistra l'Aria (il valore più alto, la copertura e, sotto, la classifica, che è sullo stesso
// inquinante), a destra la Salute del Salento in colonna (decessi, ricoveri, PS simulati). Le icone dei domini stanno nei
// titoli delle due sezioni, non più in ogni etichetta.

import { useState, type ReactNode } from 'react'

import { FONTE_ACCORPATA, type AriaMese, type Decessi, type DettaglioSimulati, type Dimissioni } from '../api/client'
import { conSegno, etichettaMese, numero, numeroIntero, percentuale, spostaMese } from '../lib/formato'
import { nomeZona, type IndiceTerritorio } from '../stato/dati'
import { BadgeModellato, BadgeSimulato, Card, StatoDato, type AssistenteCard } from './comuni'
import { IconaApri, IconaAria, IconaSalute } from './Icone'

/** Segnaposto mentre la risposta non è ancora arrivata: un caricamento non deve leggersi come un dato mancante (N/D). */
const ATTESA = '…'

/** Un numero della scheda: `principale` è il dato grande dell'aria, gli altri sono contesto. Un dato mancante è il
 *  segno di divieto, col motivo sotto e nel tooltip. */
function Numero({ etichetta, valore, unita, sotto, principale = false, simulato = false }: {
  etichetta: string
  valore: string
  unita?: string | null
  sotto: ReactNode
  principale?: boolean
  simulato?: boolean
}) {
  return (
    <div className={`kpi${principale ? ' kpi-principale' : ''}${simulato ? ' kpi-simulato blocco-simulato' : ''}${valore === 'N/D' ? ' kpi-vuoto' : ''}`}>
      <div className="kpi-etichetta">{etichetta}{simulato && <BadgeSimulato dim={16} />}</div>
      <div className="kpi-valore">
        {valore === 'N/D' ? <StatoDato stato="NO_DATA" nota={typeof sotto === 'string' ? sotto : undefined} dim={principale ? 34 : 24} />
          : valore === ATTESA ? <span className="kpi-nd">{valore}</span> : <span className="kpi-numero">{valore}</span>}
        {valore !== 'N/D' && valore !== ATTESA && unita && <small>{unita}</small>}
      </div>
      <div className="kpi-sotto">{sotto}</div>
    </div>
  )
}

/** Somma dei decessi dei distretti con VALORE nei mesi dati, con quante celle distretto × mese hanno contribuito. */
function decessiMesi(decessi: Decessi | null | undefined, mesi: string[]) {
  let somma = 0
  let con = 0
  for (const s of decessi?.distretti ?? [])
    for (const m of mesi) {
      const p = s.punti.find((x) => x.mese === m)
      if (p?.stato === 'VALORE' && p.valore != null) {
        somma += p.valore
        con++
      }
    }
  return { somma, con, totale: (decessi?.distretti.length ?? 0) * mesi.length }
}

/** Dimissioni respiratorie del Salento (somma delle tre province) nell'ultimo anno in cui tutte hanno un VALORE, e nell'anno prima. */
function ricoveriSalento(dimissioni: Dimissioni | null | undefined) {
  const serie = dimissioni?.serie ?? []
  if (!serie.length) return null
  const somma = (anno: number) => {
    let tot = 0
    for (const s of serie) {
      const p = s.punti.find((x) => x.anno === anno)
      if (p?.stato !== 'VALORE' || p.dimissioni == null) return null
      tot += p.dimissioni
    }
    return tot
  }
  const anni = [...new Set(serie.flatMap((s) => s.punti.map((p) => p.anno)))].sort((a, b) => b - a)
  const anno = anni.find((a) => somma(a) != null)
  if (anno == null) return null
  const prima = somma(anno - 1)
  return { anno, totale: somma(anno)!, variazione: prima != null ? somma(anno)! - prima : null }
}

export default function Kpi({ aria, decessi, dimissioni, mesi, inquinante, unita, indice, simulati, periodo, classifica, caricamento, assistente }: {
  aria: AriaMese | null | undefined
  decessi: Decessi | null | undefined
  dimissioni: Dimissioni | null | undefined
  mesi: string[]
  inquinante: string
  unita: string | null
  indice: IndiceTerritorio | null
  /** Ricoveri, PS e ADI simulati del Salento nella finestra; `false` = tessera nascosta (voce «PS e ADI» spenta). */
  simulati: DettaglioSimulati | null | undefined | false
  /** La finestra, nel sottotitolo. */
  periodo: string
  /** La classifica delle zone (BarreConfronto), sotto i numeri dell'aria. */
  classifica: ReactNode
  caricamento: boolean
  /** ONE sulla scheda (03/11/2026): il contesto lo costruisce App, che conosce finestra, fonte e zone. */
  assistente?: AssistenteCard
}) {
  // 1. distretto con il valore più alto
  let massimo: { id: string; valore: number; nota?: string | null } | null = null
  let conValore = 0
  for (const [id, celle] of Object.entries(aria?.distretti ?? {})) {
    const c = celle[inquinante]
    if (c?.stato === 'VALORE' && c.valore != null) {
      conValore++
      if (!massimo || c.valore > massimo.valore) massimo = { id, valore: c.valore, nota: c.nota }
    }
  }
  const nDistretti = indice?.distretti.size ?? Object.keys(aria?.distretti ?? {}).length

  // 2. residenti che vivono in un comune con almeno un valore misurato nella finestra
  let residentiCoperti = 0
  for (const [id, celle] of Object.entries(aria?.comuni ?? {}))
    if (celle[inquinante]?.stato === 'VALORE') residentiCoperti += indice?.comuni.get(id)?.residenti ?? 0
  const quotaResidenti = indice?.residentiTotali ? residentiCoperti / indice.residentiTotali : null

  // 3. decessi nel Salento nei mesi toccati dalla finestra (grana mensile) e variazione sugli stessi mesi prima
  const ora = decessiMesi(decessi, mesi)
  const prima = decessiMesi(decessi, mesi.map((m) => spostaMese(m, -mesi.length)))
  const etichettaMesi = mesi.length === 1 ? etichettaMese(mesi[0]) : `${etichettaMese(mesi[0])} → ${etichettaMese(mesi[mesi.length - 1])}`
  const completi = ora.con === ora.totale && ora.totale > 0
  const variazione = completi && prima.con === prima.totale ? ora.somma - prima.somma : null

  const ricoveri = ricoveriSalento(dimissioni)

  const modellata = aria?.fonte_modellata ?? false
  const ps = simulati ? simulati.valori.find((v) => v.indicatore === 'ps_accessi') : undefined
  const psValido = simulati && simulati.stato === 'VALORE' && ps?.per_100k != null
  const [aperta, setAperta] = useState(false)
  const azione = aperta ? 'Nascondi le note dei numeri' : 'Mostra le note dei numeri'
  const daFonte = aria?.fonte === FONTE_ACCORPATA ? 'da tutte le fonti' : aria?.fonte ? `da ${aria.fonte}` : ''
  return (
    // la scheda è il contenitore che decide la disposizione (app.css): due sezioni affiancate, una sotto l'altra se stretta
    <Card id="panoramica" className="kpi-scheda" titolo="Sintesi della finestra" sottotitolo={periodo} guida="numeri" caricamento={caricamento}
          assistente={assistente}>
      <div id="sintesi-numeri" className={`sintesi${aperta ? ' aperta' : ''}`}>
        <section className="sintesi-dominio sintesi-aria" aria-labelledby="sintesi-aria">
          <h3 id="sintesi-aria" className="sintesi-titolo">
            <IconaAria />Aria <small>{inquinante}, media della finestra{unita ? ` in ${unita}` : ''} {daFonte}</small>{modellata && <BadgeModellato dim={16} />}
          </h3>
          <div className="kpi-riga">
            <Numero
              principale
              etichetta="Il più alto"
              valore={aria === undefined ? ATTESA : massimo ? numero(massimo.valore) : 'N/D'}
              unita={massimo ? unita : null}
              sotto={aria === undefined ? 'dati aria in caricamento'
                : massimo ? nomeZona(indice, massimo.id)
                : aria === null ? 'nessun dataset aria per la finestra' : `nessun valore di ${inquinante} da ${aria.fonte}`}
            />
            <Numero
              etichetta={modellata ? 'Distretti col modello' : 'Distretti con una misura'}
              valore={aria === undefined ? ATTESA : `${conValore}/${nDistretti}`}
              sotto={aria === undefined ? 'dati aria in caricamento'
                : modellata ? 'CAMS copre ogni comune: è dato modellato, non misurato'
                : `${percentuale(quotaResidenti)} dei residenti vive in un comune con stazione che ha misurato`}
            />
          </div>
          {classifica}
        </section>
        <section className="sintesi-dominio sintesi-salute" aria-labelledby="sintesi-salute">
          <h3 id="sintesi-salute" className="sintesi-titolo"><IconaSalute />Salute <small>Salento</small></h3>
          <div className="kpi-colonna">
            <Numero
              etichetta={`Decessi, ${etichettaMesi}`}
              valore={decessi === undefined ? ATTESA : completi ? numeroIntero(ora.somma) : 'N/D'}
              sotto={decessi === undefined ? 'decessi in caricamento' : completi
                ? <>tutte le cause; {variazione != null ? `${conSegno(variazione, numeroIntero)} su ${mesi.length === 1 ? 'il mese prima' : `i ${mesi.length} mesi prima`}` : 'periodo prima non completo'}</>
                : ora.con === 0
                  ? 'ISTAT non ha ancora pubblicato questi mesi'
                  : `ISTAT ha pubblicato ${ora.con} distretti × mesi su ${ora.totale}: totale incompleto`}
            />
            <Numero
              etichetta={ricoveri ? `Ricoveri respiratori, ${ricoveri.anno}` : 'Ricoveri respiratori'}
              valore={dimissioni === undefined ? ATTESA : ricoveri ? numeroIntero(ricoveri.totale) : 'N/D'}
              sotto={dimissioni === undefined ? 'ricoveri in caricamento' : ricoveri
                ? <>dimissioni ISTAT HFA, dato annuale delle tre province; {ricoveri.variazione != null ? `${conSegno(ricoveri.variazione, numeroIntero)} sull'anno prima` : 'anno prima non disponibile'}</>
                : 'dimissioni ISTAT non ancora scaricate'}
            />
            {simulati !== false && (
              <Numero
                simulato
                etichetta="Accessi in PS"
                valore={simulati === undefined ? ATTESA : psValido ? numero(ps!.per_100k!) : 'N/D'}
                unita="per 100.000 al giorno"
                sotto={simulati === undefined ? 'dati simulati in caricamento' : psValido
                  ? `${numeroIntero(ps!.totale)} accessi nella finestra, scenario ${simulati!.scenario}`
                  : simulati?.nota ?? 'dati simulati non disponibili'}
              />
            )}
          </div>
        </section>
      </div>
      <button type="button" className="kpi-apri" aria-expanded={aperta} aria-controls="sintesi-numeri" aria-label={azione} title={azione}
              onClick={() => setAperta((a) => !a)}>
        <IconaApri dim={18} />
      </button>
    </Card>
  )
}
