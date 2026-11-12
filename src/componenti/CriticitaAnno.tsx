// Periodi critici dell'anno, secondo blocco della tab «Stagionalità»: perché il consiglio indica quei mesi (27/10/2026).
// Scelte di Matteo: un mese è critico per un tema se è fra i suoi 3 mesi peggiori; un indicatore per tema (aria,
// temperatura, decessi, PS, PS degli assistiti ADI, ricoveri respiratori), così nessun tema pesa due volte; i mesi
// vicini con almeno due temi critici formano un periodo. Dal 29/10/2026 ogni periodo è una tabellina schematica (tema,
// mese peggiore, scarto dalla media dell'anno, rango), con gli indicatori di dettaglio in un gruppo a parte: niente
// unità ripetute né «1° mese dell'anno», il valore assoluto sta nel tooltip. I periodi sono affiancati e divisi da un
// filetto. I numeri arrivano già calcolati da /api/stagionalita (`criticita`, localhost/server/dati_stagionalita.py).
// PS, ADI e ricoveri sono simulati: sempre col badge. Esplorativo, non causale.

import { useState } from 'react'

import type { CriticitaAnno as DatiCriticita, MotivoCriticita, PeriodoCriticita } from '../api/client'
import { numero } from '../lib/formato'
import { elenco, iniziale, MESI, MESI_LUNGHI, scarto } from '../lib/stagionalita'
import { BadgeModellato, BadgeSimulato, SegnoLimite } from './comuni'
import { IconaApri } from './Icone'

const LIVELLO = { alta: 'criticità alta', media: 'criticità media', bassa: 'criticità bassa' } as const

function titoloRiga(m: MotivoCriticita, nome: string) {
  const altri = m.mesi.filter((x) => x !== m.mese)
  return [
    `${nome}, ${MESI_LUNGHI[m.mese - 1]}: ${m.formato === 'rango' ? `rango medio dei 5 inquinanti ${numero(m.valore)}` : `${numero(m.valore)} ${m.unita ?? ''}`}`,
    m.posizione != null ? `${m.posizione}° mese peggiore dell'anno` : null,
    m.scarto != null ? `${scarto(m.scarto, m.scarto_assoluto)} sulla media dei 12 mesi` : null,
    altri.length ? `critico anche a ${elenco(altri.map((x) => MESI_LUNGHI[x - 1]))}` : null,
  ].filter(Boolean).join('\n')
}

function RigaMotivo({ m, nome }: { m: MotivoCriticita; nome: string }) {
  return (
    <tr className={m.simulata ? 'riga-simulata' : undefined} title={titoloRiga(m, nome)}>
      <th scope="row">
        <span className="nome-dominio">{nome}{m.modellata && <BadgeModellato dim={14} />}{m.simulata && <BadgeSimulato dim={16} />}</span>
      </th>
      <td className="num">{MESI[m.mese - 1]}</td>
      <td className="num">{m.scarto != null ? <b>{scarto(m.scarto, m.scarto_assoluto)}</b> : <span className="testo-stato">—</span>}</td>
      <td className="num">{m.posizione ?? '—'}</td>
    </tr>
  )
}

function SchedaPeriodo({ p, k, indice, onMese }: { p: PeriodoCriticita; k: DatiCriticita; indice: number; onMese: (m: number) => void }) {
  const [dettaglio, setDettaglio] = useState(false)
  const nomi = new Map(k.temi.map((t) => [t.id, t.nome]))
  const anche = p.anche ?? []
  const limiti = p.limiti_superati ?? []
  return (
    <article className="periodo-critico">
      <header className="periodo-testa">
        <span className="periodo-numero" aria-hidden="true">{indice + 1}</span>
        <div>
          <h3>
            <button type="button" className="periodo-titolo" onClick={() => onMese(p.mese_picco)}
                    title={`Dettaglio di ${MESI_LUNGHI[p.mese_picco - 1]} anno per anno`}>{iniziale(p.etichetta)}</button>
          </h3>
          <p className="periodo-sotto">
            {p.livello && <span className={`chip-livello livello-${p.livello}`}>{LIVELLO[p.livello]}</span>}
            {' '}picco a {MESI_LUNGHI[p.mese_picco - 1]}, {p.massimo} {p.massimo === 1 ? 'tema' : 'temi'} su {k.temi_contati}
          </p>
        </div>
      </header>
      <table className="tabella tabella-compatta tabella-periodo">
        <thead>
          <tr>
            <th scope="col">Tema</th>
            <th scope="col" className="num">Mese</th>
            <th scope="col" className="num" title="rispetto alla media dei 12 mesi">Sull'anno</th>
            <th scope="col" className="num" title="1 = mese peggiore dell'anno">Rango</th>
          </tr>
        </thead>
        <tbody>
          {p.motivi.map((m) => <RigaMotivo key={m.id} m={m} nome={nomi.get(m.id) ?? m.etichetta} />)}
        </tbody>
        {anche.length > 0 && (
          <tbody>
            <tr className="riga-gruppo">
              <th scope="rowgroup" colSpan={4}>
                {/* il dettaglio (inquinanti, PS per causa, ADI…) si apre a richiesta: chiuso, i periodi restano corti */}
                <button type="button" className="apri-righe" aria-expanded={dettaglio} onClick={() => setDettaglio(!dettaglio)}>
                  <IconaApri /><span className="nome-dominio">Dettaglio, non conta fra i temi ({anche.length})</span>
                </button>
              </th>
            </tr>
            {dettaglio && anche.map((m) => <RigaMotivo key={m.id} m={m} nome={m.etichetta} />)}
          </tbody>
        )}
      </table>
      {limiti.length > 0 && (
        <p className="periodo-riga" title="In almeno un mese del periodo e in almeno un anno (per il Salento: in almeno un distretto), a parità di statistica">
          <SegnoLimite /> Limite D.Lgs. 155/2010 superato: {elenco(limiti)}
        </p>
      )}
    </article>
  )
}

export default function CriticitaAnno({ k, onMese }: { k: DatiCriticita; onMese: (m: number) => void }) {
  if (!k.periodi.length) return <p className="testo-stato">Nessun gruppo di mesi vicini è fra i peggiori per almeno due temi.</p>
  return (
    <div className="griglia-periodi">
      {k.periodi.map((p, i) => <SchedaPeriodo key={p.etichetta} p={p} k={k} indice={i} onMese={onMese} />)}
    </div>
  )
}
