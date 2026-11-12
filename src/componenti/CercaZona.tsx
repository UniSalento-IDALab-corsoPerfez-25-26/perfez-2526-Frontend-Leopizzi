// Ricerca di distretti e comuni sulla carta (29/10/2026, richiesta di Matteo): un campo nell'angolo in alto a destra,
// accanto allo zoom, e i risultati in un pannello che si apre sotto. Scegliere un risultato porta la zona in primo
// piano come un clic sulla carta: la scheda la mostra, il livello passa a Distretti o Comuni e la carta scorre solo se
// la zona non si vede (scelte di Matteo; la zona non entra nel confronto). Si cerca per nome, senza accenti né
// maiuscole; un distretto anche per numero («51»), sede o sigla («LE-51»). Da tastiera: frecce, Invio, Esc.

import { useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'

import { nomeZona, type IndiceTerritorio } from '../stato/dati'
import { IconaCerca, IconaChiudi } from './Icone'

const MAX_DISTRETTI = 4
const MAX_COMUNI = 8

/** Testo da confrontare: minuscolo, senza accenti, apostrofi uniformi. Lascia invariata la lunghezza dei nomi
 *  (ogni lettera accentata resta una lettera), così la parte trovata si può evidenziare sul nome originale. */
const piano = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'").toLowerCase()

interface Voce {
  id: string
  tipo: 'distretto' | 'comune'
  nome: string
  dettaglio: string
  chiavi: string[]
}

function vociDi(indice: IndiceTerritorio): Voce[] {
  const provincia = (id: string) => indice.province.find((p) => p.id_provincia === id)?.denominazione ?? id
  const voci: Voce[] = []
  for (const [id, d] of indice.distretti) {
    const numero = d.denominazione.replace(/\D/g, '')
    voci.push({ id, tipo: 'distretto', nome: nomeZona(indice, id), dettaglio: `Distretto socio-sanitario, ASL di ${provincia(d.id_provincia)}`,
                chiavi: [nomeZona(indice, id), d.denominazione, d.sede ?? '', id, numero].filter(Boolean).map(piano) })
  }
  for (const [id, c] of indice.comuni) {
    voci.push({ id, tipo: 'comune', nome: c.denominazione, dettaglio: `Comune del distretto ${nomeZona(indice, c.id_distretto)}`,
                chiavi: [piano(c.denominazione)] })
  }
  return voci
}

/** 0 = uguale, 1 = inizia così, 2 = una parola inizia così, 3 = contiene; null = non trovato. */
function punteggio(v: Voce, q: string): number | null {
  let migliore: number | null = null
  for (const k of v.chiavi) {
    const p = k === q ? 0 : k.startsWith(q) ? 1 : k.includes(` ${q}`) || k.includes(`(${q}`) || k.includes(`'${q}`) ? 2 : k.includes(q) ? 3 : null
    if (p != null && (migliore == null || p < migliore)) migliore = p
  }
  return migliore
}

function evidenzia(nome: string, q: string): ReactNode {
  const i = piano(nome).indexOf(q)
  if (i < 0 || piano(nome).length !== nome.length) return nome
  return <>{nome.slice(0, i)}<mark>{nome.slice(i, i + q.length)}</mark>{nome.slice(i + q.length)}</>
}

export default function CercaZona({ indice, focus, onScegli }: {
  indice: IndiceTerritorio | null
  /** Zona in primo piano: nei risultati lo si dice. */
  focus: string | null
  onScegli: (id: string) => void
}) {
  const base = useId()
  const campo = useRef<HTMLInputElement>(null)
  const [testo, setTesto] = useState('')
  const [aperta, setAperta] = useState(false)
  const [attiva, setAttiva] = useState(0)

  const voci = useMemo(() => (indice ? vociDi(indice) : []), [indice])
  const q = piano(testo).trim().replace(/\s+/g, ' ')
  const { distretti, comuni } = useMemo(() => {
    if (!q) return { distretti: [] as Voce[], comuni: [] as Voce[] }
    const trovate = voci.flatMap((v) => { const p = punteggio(v, q); return p == null ? [] : [{ v, p }] })
      .sort((a, b) => a.p - b.p || a.v.nome.localeCompare(b.v.nome, 'it'))
      .map((t) => t.v)
    return { distretti: trovate.filter((v) => v.tipo === 'distretto').slice(0, MAX_DISTRETTI),
             comuni: trovate.filter((v) => v.tipo === 'comune').slice(0, MAX_COMUNI) }
  }, [voci, q])
  const elenco = [...distretti, ...comuni]
  const mostra = aperta && !!q
  const idVoce = (v: Voce) => `${base}-${v.id}`

  const scegli = (v: Voce) => {
    onScegli(v.id)
    setTesto('')
    setAttiva(0)
    setAperta(false)
    campo.current?.blur()
  }

  const tasti = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!elenco.length) return
      e.preventDefault()
      setAperta(true)
      setAttiva((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + elenco.length) % elenco.length)
    } else if (e.key === 'Enter') {
      const v = elenco[attiva] ?? elenco[0]
      if (mostra && v) { e.preventDefault(); scegli(v) }
    } else if (e.key === 'Escape') {
      if (mostra) setAperta(false)
      else setTesto('')
    }
  }

  // un gruppo di risultati; `inizio` è la posizione della prima voce nell'elenco unico che le frecce percorrono
  const gruppo = (titolo: string, gruppoVoci: Voce[], inizio: number) => gruppoVoci.length > 0 && (
    <div role="group" aria-labelledby={`${base}-${titolo}`}>
      <p className="cerca-gruppo" id={`${base}-${titolo}`}>{titolo}</p>
      {gruppoVoci.map((v, j) => {
        const i = inizio + j
        return (
          <div key={v.id} id={idVoce(v)} role="option" aria-selected={i === attiva} className={`cerca-voce${i === attiva ? ' attiva' : ''}`}
               onMouseDown={(e) => e.preventDefault()} onMouseMove={() => setAttiva(i)} onClick={() => scegli(v)}>
            <span className="cerca-nome">{evidenzia(v.nome, q)}</span>
            <span className="cerca-dettaglio">{v.dettaglio}{v.id === focus ? ', già in primo piano' : ''}</span>
          </div>
        )
      })}
    </div>
  )

  return (
    <div className="carta-cerca">
      <div className="cerca-campo">
        <IconaCerca />
        <input ref={campo} type="text" role="combobox" aria-label="Cerca un distretto o un comune" placeholder="Cerca distretto o comune"
               aria-expanded={mostra} aria-controls={`${base}-elenco`} aria-autocomplete="list"
               aria-activedescendant={mostra && elenco[attiva] ? idVoce(elenco[attiva]) : undefined}
               value={testo} spellCheck={false} autoComplete="off"
               onChange={(e) => { setTesto(e.target.value); setAttiva(0); setAperta(true) }}
               onFocus={() => setAperta(true)} onBlur={() => setAperta(false)} onKeyDown={tasti} />
        {testo && (
          <button type="button" className="cerca-svuota" aria-label="Svuota la ricerca" title="Svuota la ricerca"
                  onMouseDown={(e) => e.preventDefault()} onClick={() => { setTesto(''); setAttiva(0); campo.current?.focus() }}>
            <IconaChiudi dim={14} />
          </button>
        )}
      </div>
      {mostra && (
        <div className="cerca-risultati">
          {elenco.length === 0 ? (
            <p className="cerca-vuoto" role="status">Nessun distretto o comune con «{testo.trim()}»</p>
          ) : (
            <div id={`${base}-elenco`} role="listbox" aria-label="Distretti e comuni trovati">
              {gruppo('Distretti', distretti, 0)}
              {gruppo('Comuni', comuni, distretti.length)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
