// Decessi secondo ogni fonte, nell'anno in cui finisce la finestra della barra (scelte di Matteo del 27/10/2026).
// Distretto × mese: ISTAT giornaliero (somma del mese) contro il bilancio demografico mensile ISTAT (2019-2024).
// Provincia × mese: ISTAT giornaliero contro Eurostat, che ridistribuisce i dati ISTAT e li pubblica per settimana ISO:
// ogni settimana va al mese del suo giovedì, per entrambe le fonti. Mai sotto il distretto né sotto il mese (privacy,
// repository Backend, docs/Regole_dei_dati.md): per un comune si mostra il suo distretto e lo si dice.

import { FONTE_ACCORPATA, type ConfrontoConteggi, type SerieFontePeriodo } from '../api/client'
import { conSegno, etichettaMese, etichettaMeseBreve, numero, numeroIntero, percentuale } from '../lib/formato'
import { nomeZona, useFontiSalute, type IndiceTerritorio } from '../stato/dati'
import { useTema, type NomeToken, type Token } from '../stato/token'
import { Card, Errore, GraficoVuoto, Pallino, StatoDato, Vuoto, type AssistenteCard } from './comuni'
import { IconaSalute } from './Icone'
import { PannelloFonti } from './ConfrontoFonti'
import { TabellaSerie, type Riga, type Serie } from './grafici'

// colori validati della palette delle fonti: il canale giornaliero, che è la fonte della dashboard, nell'inchiostro
const COLORE: Record<string, NomeToken> = { A: 'fonte-arpa', D: 'fonte-openaq', Eurostat: 'fonte-eea' }

function righeDa(serie: SerieFontePeriodo[]): Riga[] {
  return (serie[0]?.punti ?? []).map((p, i) => {
    const riga: Riga = { periodo: p.periodo }
    for (const s of serie) {
      const x = s.punti[i]
      riga[s.chiave] = x?.stato === 'VALORE' ? (x.valore ?? null) : null
      riga[`${s.chiave}__stato`] = x?.stato ?? 'NO_DATA'
      riga[`${s.chiave}__nota`] = x?.nota ?? null
    }
    return riga
  })
}

const serieDa = (token: Token, serie: SerieFontePeriodo[]): Serie[] =>
  serie.map((s) => ({ chiave: s.chiave, nome: s.fonte, colore: token[COLORE[s.chiave] ?? 'testo-2'] }))

export default function FontiSalute({ mese, zona, indice }: {
  mese: string | null
  zona: string | null
  indice: IndiceTerritorio | null
}) {
  const { token } = useTema()
  const anno = mese ? Number(mese.slice(0, 4)) : null
  const q = useFontiSalute(anno, zona)
  const d = q.data

  const righeDistretto = d ? righeDa(d.mensile) : []
  const righeProvincia = d ? righeDa(d.provinciale) : []
  const serieDistretto = d ? serieDa(token, d.mensile) : []
  const serieProvincia = d ? serieDa(token, d.provinciale) : []
  const tutte = [...(d?.mensile ?? []), ...(d?.provinciale ?? [])]
  const colore = (nome: string) => token[COLORE[tutte.find((x) => x.fonte === nome)?.chiave ?? ''] ?? 'testo-2']
  const perComune = d?.zona_richiesta.tipo === 'comune'
  // ONE (03/11/2026): la zona in primo piano e l'anno del mese della finestra
  const assistente: AssistenteCard = {
    card: 'fonti_decessi', titolo: 'Decessi secondo ogni fonte',
    descrizione: [zona && nomeZona(indice, zona), anno != null && String(anno)].filter(Boolean).join(', '),
    contesto: zona && mese ? { mese, zone: [zona], fonte: FONTE_ACCORPATA } : null,
  }

  return (
    <Card
      caricamento={q.isFetching}
      id="fonti-salute"
      guida="decessi-confronto"
      assistente={assistente}
      icona={<IconaSalute />}
      titolo="Decessi secondo ogni fonte"
      sottotitolo={d ? `${nomeZona(indice, d.zona.id)}${perComune ? `, il distretto di ${d.zona_richiesta.denominazione}` : ''}, ${d.anno}`
        : 'ISTAT giornaliero contro il bilancio mensile ISTAT ed Eurostat'}
      tabella={righeDistretto.length ? (
        <>
          <TabellaSerie righe={righeDistretto} chiaveX="periodo" intestazioneX="Mese (distretto)" serie={serieDistretto} etichettaX={etichettaMese} formato={numeroIntero} />
          <TabellaSerie righe={righeProvincia} chiaveX="periodo" intestazioneX="Mese (provincia)" serie={serieProvincia} etichettaX={etichettaMese} formato={numeroIntero} />
        </>
      ) : undefined}
    >
      {!zona ? (
        <Vuoto titolo="Nessuna zona in primo piano">Clicca una zona sulla mappa per confrontare le fonti dei decessi.</Vuoto>
      ) : q.isError ? (
        <Errore errore={q.error} />
      ) : d === null ? (
        <Vuoto titolo="Confronto fra le fonti dei decessi non ancora preparato">
          Il confronto con il bilancio mensile ISTAT ed Eurostat si prepara una volta, in locale, quando si aggiornano i dati.
        </Vuoto>
      ) : !d ? (
        <GraficoVuoto altezza={300}>Serie dei decessi in caricamento…</GraficoVuoto>
      ) : (
        <>
          <div className="pannelli">
            <PannelloFonti titolo="Per distretto" sottotitolo="Somma dei decessi giornalieri contro il bilancio demografico mensile, due pubblicazioni ISTAT distinte"
                           righe={righeDistretto} serie={serieDistretto} chiaveX="periodo" tickX={etichettaMeseBreve} etichettaX={etichettaMese}
                           formato={numeroIntero} punti primaSotto />
            <PannelloFonti titolo={`Per provincia, ${d.denominazione_provincia}`}
                           sottotitolo="Somma dei decessi giornalieri contro Eurostat, che riceve gli stessi dati da ISTAT"
                           righe={righeProvincia} serie={serieProvincia} chiaveX="periodo" tickX={etichettaMeseBreve} etichettaX={etichettaMese}
                           formato={numeroIntero} punti primaSotto />
          </div>
          <div className="tabella-scorre">
            <table className="tabella tabella-compatta">
              <caption>Concordanza fra coppie di fonti, sui soli mesi in cui entrambe hanno un valore</caption>
              <thead>
                <tr>
                  <th scope="col">Coppia</th>
                  <th scope="col">Livello</th>
                  <th scope="col" className="num">Mesi in comune</th>
                  <th scope="col" className="num">Identici</th>
                  <th scope="col" className="num">Entro ±1</th>
                  <th scope="col" className="num">Diff. totale (B − A)</th>
                  <th scope="col" className="num">Correlazione</th>
                </tr>
              </thead>
              <tbody>
                {d.confronti.map((c: ConfrontoConteggi) => (
                  <tr key={c.livello} title={c.nota}>
                    <th scope="row">
                      <span className="coppia"><Pallino colore={colore(c.fonte_a)} />{c.fonte_a}<span aria-hidden="true">↔</span><Pallino colore={colore(c.fonte_b)} />{c.fonte_b}</span>
                    </th>
                    <td className="nowrap">{c.livello}</td>
                    <td className="num">{numeroIntero(c.celle_comuni)}</td>
                    {c.celle_comuni ? (
                      <>
                        <td className="num">{percentuale(c.identiche)}</td>
                        <td className="num">{percentuale(c.entro_uno)}</td>
                        <td className="num">{conSegno(c.differenza_totale, numeroIntero)}</td>
                        <td className="num">{numero(c.correlazione)}</td>
                      </>
                    ) : (
                      <td colSpan={4}><StatoDato stato="NO_DATA" nota={tutte.find((s) => s.fonte === c.fonte_b)?.punti[0]?.nota} /> {tutte.find((s) => s.fonte === c.fonte_b)?.punti[0]?.nota}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="nota-grafico">{d.nota_privacy} Tabelle del confronto generate il {d.generato_il}.</p>
        </>
      )}
    </Card>
  )
}
