// Consiglio in cima alla tab «Stagionalità»: il sommario della pagina (27/10/2026, rifatto il 29/10/2026 su richiesta
// di Matteo). Il dottore in grande a sinistra e il consiglio in un fumetto: titolo, una frase, cinque punti con
// l'etichetta (Quando, Perché, Cosa preparare, Sta cambiando, Da tenere d'occhio). Ogni etichetta porta al blocco della
// pagina che spiega il punto. Il testo è composto solo dai dati di /api/stagionalita (`criticita` e l'andamento delle
// righe), nessuna regola nuova. Spunti da valutare, non prescrizioni; esplorativo, non causale.

import { useId, type ReactNode } from 'react'

import type { CriticitaAnno as DatiCriticita, RigaStagionalita, SpuntoCriticita } from '../api/client'
import { etichettaMese } from '../lib/formato'
import { elenco, iniziale, MESI_LUNGHI, nomeIndicatore, scarto, vaiA } from '../lib/stagionalita'
import { BadgeSimulato } from './comuni'
import { IconaScendi } from './Icone'

/** Avatar da medico: camice, divisa nel blu petrolio dell'aria, stetoscopio, sul quadrato lime del marchio. Decorativo. */
function AvatarMedico({ dimensione = 72 }: { dimensione?: number }) {
  const taglio = useId()
  const pelle = '#e7b48e'
  const scuro = '#2b2522'
  return (
    <svg className="avatar-medico" width={dimensione} height={dimensione} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={taglio}><circle cx="32" cy="32" r="32" /></clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill="var(--lime)" />
      <g clipPath={`url(#${taglio})`}>
        {/* camice e divisa */}
        <path d="M8 66 C8 51 18 44.5 32 44.5 C46 44.5 56 51 56 66 Z" fill="#ffffff" />
        <path d="M26.5 45 L32 53.5 L37.5 45 C35.8 44.7 34 44.5 32 44.5 C30 44.5 28.2 44.7 26.5 45 Z" fill="#2f6f7e" />
        <path d="M26.5 45 L32 53.5 L28.5 66 L24 66 L22.5 46.4 Z" fill="#e4e4e6" />
        <path d="M37.5 45 L32 53.5 L35.5 66 L40 66 L41.5 46.4 Z" fill="#e4e4e6" />
        {/* collo e testa */}
        <path d="M28 36 h8 v7 c0 2.2 -1.8 4 -4 4 s-4 -1.8 -4 -4 Z" fill={pelle} />
        <ellipse cx="32" cy="27.5" rx="10" ry="11" fill={pelle} />
        <ellipse cx="21.8" cy="28.5" rx="1.6" ry="2.4" fill={pelle} />
        <ellipse cx="42.2" cy="28.5" rx="1.6" ry="2.4" fill={pelle} />
        {/* capelli */}
        <path d="M21.6 27 C21 17.5 26.5 13.5 32.5 13.5 C39 13.5 43.5 17.5 42.4 27 C41 22.5 37.5 20 32 20.3 C27 20.6 23.5 23 21.6 27 Z" fill={scuro} />
        {/* volto */}
        <circle cx="28.2" cy="28.5" r="1.25" fill={scuro} />
        <circle cx="35.8" cy="28.5" r="1.25" fill={scuro} />
        <path d="M29 33 Q32 35.4 35 33" stroke={scuro} strokeWidth="1.3" fill="none" strokeLinecap="round" />
        {/* stetoscopio */}
        <path d="M25 45.5 C23.2 51.5 25 56.5 29.5 57" stroke="#3a3a40" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <path d="M39 45.5 C41 50.5 40.5 54.5 38.2 56.6" stroke="#3a3a40" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        <circle cx="37.6" cy="58.4" r="2.8" fill="#3a3a40" />
        <circle cx="37.6" cy="58.4" r="1.2" fill="#9a9aa0" />
      </g>
    </svg>
  )
}

/** Un punto del consiglio: l'etichetta porta al blocco che lo spiega. */
function Punto({ etichetta, verso, titolo, children }: { etichetta: string; verso: string; titolo: string; children: ReactNode }) {
  return (
    <>
      <dt>
        <button type="button" className="consiglio-vai" onClick={() => vaiA(verso)} title={`Vai a «${titolo}»`}>
          {etichetta}<IconaScendi dim={14} />
        </button>
      </dt>
      <dd>{children}</dd>
    </>
  )
}

/** «settembre 2026: SO2 +28%, PM2.5 +23%, temperatura massima +1,3 °C»: gli indicatori fuori soglia nell'ultimo mese. */
function Cambiamenti({ righe, k }: { righe: RigaStagionalita[]; k: DatiCriticita }) {
  const cambiati = righe.filter((r) => r.andamento && (r.andamento.classe === 'in_aumento' || r.andamento.classe === 'in_calo'))
  if (!cambiati.length) return <>nessun indicatore lontano dal solito nell'ultimo mese completo.</>
  const perMese = new Map<string, RigaStagionalita[]>()
  for (const r of cambiati) perMese.set(r.andamento!.mese_riferimento!, [...(perMese.get(r.andamento!.mese_riferimento!) ?? []), r])
  const forza = (r: RigaStagionalita) => (r.id === 'calore' ? 0 : Math.abs(r.andamento!.delta_percentuale ?? 0))
  return (
    <>
      {[...perMese.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([mese, voci], i) => (
        <span key={mese}>
          {i > 0 && '; '}<strong>{etichettaMese(mese)}</strong>{' '}
          {elenco([...voci].sort((a, b) => forza(b) - forza(a)).map((r) => {
            const a = r.andamento!
            const nome = nomeIndicatore(r, k)
            const v = r.id === 'calore' ? scarto(a.delta ?? 0, true) : a.delta_percentuale != null ? scarto(a.delta_percentuale, false) : scarto(a.delta ?? 0, true)
            // «temperatura massima» in minuscolo dentro la frase, le sigle (SO2, O3, PM2.5) come sono
            return `${/^[A-Z][a-zà-ù]/.test(nome) ? nome.toLowerCase() : nome} ${v}`
          }))}
        </span>
      ))}
      {' '}rispetto agli anni precedenti.
    </>
  )
}

export default function ConsiglioStagionalita({ k, righe, area, onMese }: {
  k: DatiCriticita
  righe: RigaStagionalita[]
  area: string
  onMese: (m: number) => void
}) {
  const nomi = new Map(k.temi.map((t) => [t.id, t.nome[0].toLowerCase() + t.nome.slice(1)]))
  const simulati = k.temi.filter((t) => t.simulata && t.disponibile)
  const [primo] = k.periodi
  const attenzione = k.attenzione ?? []
  const temiPrimo = primo ? primo.motivi.map((m) => nomi.get(m.id) ?? m.etichetta) : []
  const simulatiNelPrimo = !!primo?.motivi.some((m) => m.simulata)

  // gli spunti di tutti i periodi, una volta sola, con i periodi in cui valgono (detti solo se non valgono per tutti)
  const spunti = new Map<string, { s: SpuntoCriticita; periodi: string[] }>()
  for (const p of k.periodi)
    for (const s of p.spunti ?? []) spunti.set(s.tema, { s, periodi: [...(spunti.get(s.tema)?.periodi ?? []), p.etichetta] })

  const scegli = (m: number) => { onMese(m); vaiA('dettaglio-mese') }

  return (
    <section className="consiglio" aria-labelledby="consiglio-titolo">
      <AvatarMedico dimensione={128} />
      <div className="fumetto">
        {!primo ? (
          <>
            <h2 id="consiglio-titolo" className="consiglio-titolo">Nessun periodo critico: l'anno è uniforme</h2>
            <p className="consiglio-frase">Nel {area} nessun gruppo di mesi vicini è fra i peggiori per almeno due temi.</p>
          </>
        ) : (
          <>
            <h2 id="consiglio-titolo" className="consiglio-titolo">Prepararsi per {primo.etichetta}</h2>
            <p className="consiglio-frase">
              Nel {area} è il periodo più critico: a {MESI_LUNGHI[primo.mese_picco - 1]} {primo.massimo} temi su {k.temi_contati} sono fra i mesi peggiori dell'anno.
            </p>
          </>
        )}
        <dl className="consiglio-punti">
          {primo && (
            <Punto etichetta="Quando" verso="periodi" titolo="Periodi critici">
              {k.periodi.map((p, i) => (
                <span key={p.etichetta}>
                  {i > 0 && '; poi '}
                  <button type="button" className="link-mese" onClick={() => scegli(p.mese_picco)}
                          title={`Dettaglio di ${MESI_LUNGHI[p.mese_picco - 1]} anno per anno`}>{p.etichetta}</button>
                  {p.mesi.length > 1 && <>, picco a {MESI_LUNGHI[p.mese_picco - 1]}</>}
                  {i > 0 && <> ({elenco(p.motivi.map((m) => nomi.get(m.id) ?? m.etichetta))})</>}
                </span>
              ))}
            </Punto>
          )}
          {primo && (
            <Punto etichetta="Perché" verso="mesi-a-confronto" titolo="12 mesi a confronto">
              {iniziale(elenco(temiPrimo))} fra i mesi peggiori{simulatiNelPrimo && <> <BadgeSimulato dim={16} /></>}
              {(primo.limiti_superati ?? []).length > 0 && <>; limite di legge superato per {elenco(primo.limiti_superati ?? [])}</>}.
            </Punto>
          )}
          {spunti.size > 0 && (
            <Punto etichetta="Cosa preparare" verso="periodi" titolo="Periodi critici">
              <ul className="consiglio-spunti">
                {[...spunti.values()].map(({ s, periodi }) => (
                  <li key={s.tema} title={iniziale(s.esteso)}>
                    <strong>{s.titolo}</strong> {s.breve}
                    {k.periodi.length > 1 && periodi.length < k.periodi.length && <small> ({elenco(periodi)})</small>}
                  </li>
                ))}
              </ul>
            </Punto>
          )}
          <Punto etichetta="Sta cambiando" verso="cambiamenti" titolo="Cosa sta cambiando">
            <Cambiamenti righe={righe} k={k} />
          </Punto>
          {attenzione.length > 0 && (
            <Punto etichetta="Da tenere d'occhio" verso="mesi-a-confronto" titolo="12 mesi a confronto">
              {attenzione.map((a, i) => (
                <span key={a.mese}>
                  {i > 0 && (i === attenzione.length - 1 ? ' e ' : ', ')}
                  <button type="button" className="link-mese" onClick={() => scegli(a.mese)}>{MESI_LUNGHI[a.mese - 1]}</button>
                  {' '}({elenco(a.temi.map((t) => nomi.get(t) ?? t))})
                </span>
              ))}.
            </Punto>
          )}
        </dl>
        <p className="consiglio-nota">
          Spunti da valutare, non prescrizioni; lettura esplorativa, non causale.
          {simulati.length > 0 && (
            <> <BadgeSimulato dim={16} /> {iniziale(elenco(simulati.map((t) => nomi.get(t.id) ?? t.nome)))} sono simulati
              {k.simulati_nella_sintesi ? ': «nella sintesi» li toglie.' : ' e ora esclusi dalla sintesi.'}</>
          )}
        </p>
      </div>
    </section>
  )
}
