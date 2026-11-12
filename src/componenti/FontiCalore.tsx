// Temperatura secondo ogni fonte nella zona in primo piano (27/10/2026). ERA5-Land (rianalisi, modellata) e ARPA meteo
// (stazioni, misurata) non si mediano mai fra loro. La concordanza si misura sulle sole coppie comune × giorno con un
// valore in entrambe: in un distretto ARPA copre solo i comuni con una stazione, quindi si confrontano gli stessi comuni.

import { useState } from 'react'

import { FONTE_ACCORPATA } from '../api/client'

import { conSegno, etichettaGiorno, etichettaMese, numero, numeroIntero } from '../lib/formato'
import { nomeZona, useFontiCalore, type IndiceTerritorio } from '../stato/dati'
import { useTema, type NomeToken } from '../stato/token'
import { BadgeModellato, Card, Errore, GraficoVuoto, Pallino, Vuoto, type AssistenteCard } from './comuni'
import { IconaCalore } from './Icone'
import { PannelloFonti } from './ConfrontoFonti'
import { TabellaSerie, type Riga, type Serie } from './grafici'
import { SegmentiAnimati } from './SegmentiAnimati'

type Statistica = 'media' | 'massima' | 'minima'
const STATISTICHE: { id: Statistica; testo: string }[] = [
  { id: 'media', testo: 'Media' }, { id: 'massima', testo: 'Massima' }, { id: 'minima', testo: 'Minima' },
]
// stesso ente, stesso colore delle fonti dell'aria: ARPA nell'inchiostro, Copernicus (CAMS, ERA5-Land) nell'arancio
const COLORE: Record<string, NomeToken> = { 'ARPA meteo': 'fonte-arpa', 'ERA5-Land': 'fonte-cams' }

export default function FontiCalore({ mese, zona, indice }: {
  mese: string | null
  zona: string | null
  indice: IndiceTerritorio | null
}) {
  const { token } = useTema()
  const [statistica, setStatistica] = useState<Statistica>('media')
  const q = useFontiCalore(mese, zona, statistica)
  const d = q.data

  // ARPA prima: è la misura, ERA5-Land il modello che le si confronta
  const fonti = [...(d?.serie ?? [])].sort((a, b) => Number(a.modellata) - Number(b.modellata))
  const serie: Serie[] = fonti.map((s) => ({
    chiave: s.fonte, nome: s.modellata ? `${s.fonte} (modello)` : s.fonte, colore: token[COLORE[s.fonte] ?? 'testo-2'], tratteggio: s.modellata,
  }))
  const righe: Riga[] = (fonti[0]?.punti ?? []).map((p, i) => {
    const riga: Riga = { giorno: p.giorno }
    for (const s of fonti) {
      const x = s.punti[i]
      riga[s.fonte] = x?.stato === 'VALORE' ? (x.valore ?? null) : null
      riga[`${s.fonte}__stato`] = x?.stato ?? 'NO_DATA'
      riga[`${s.fonte}__nota`] = x?.nota ?? null
    }
    return riga
  })
  const c = d?.confronto
  // ONE (03/11/2026): la zona in primo piano, il mese e la statistica scelta
  const assistente: AssistenteCard = {
    card: 'fonti_calore', titolo: `Temperatura ${statistica} secondo ogni fonte`,
    descrizione: [zona && nomeZona(indice, zona), mese && etichettaMese(mese)].filter(Boolean).join(', '),
    contesto: zona && mese ? { mese, zone: [zona], statistica_calore: statistica, fonte: FONTE_ACCORPATA } : null,
  }

  return (
    <Card
      caricamento={q.isFetching}
      id="fonti-calore"
      guida="calore-confronto"
      assistente={assistente}
      icona={<IconaCalore />}
      titolo={`Temperatura ${statistica} secondo ogni fonte`}
      sottotitolo={zona ? `${nomeZona(indice, zona)}${mese ? `, ${etichettaMese(mese)}` : ''}, in ${d?.unita ?? '°C'}` : 'ERA5-Land, modellata, contro le stazioni ARPA meteo'}
      azioni={<SegmentiAnimati classe="segmenti-piccoli" etichetta="Statistica giornaliera della temperatura" valore={statistica}
                               onScegli={setStatistica} opzioni={STATISTICHE} />}
      tabella={righe.length ? <TabellaSerie righe={righe} chiaveX="giorno" intestazioneX="Giorno" serie={serie} unita={d?.unita} etichettaX={etichettaGiorno} /> : undefined}
    >
      {!zona ? (
        <Vuoto titolo="Nessuna zona in primo piano">Clicca una zona sulla mappa per confrontare le fonti della temperatura.</Vuoto>
      ) : q.isError ? (
        <Errore errore={q.error} />
      ) : !d || !c ? (
        <GraficoVuoto altezza={300}>Serie della temperatura in caricamento…</GraficoVuoto>
      ) : (
        <>
          <PannelloFonti righe={righe} serie={serie} unita={d.unita} dominioY={['auto', 'auto']} />
          <p className="nota-grafico">
            <BadgeModellato /> ERA5-Land (linea tratteggiata) è una rianalisi su celle di circa 9 km, ARPA una misura in un punto.
            {d.zona.tipo === 'distretto' && ' Nel distretto la linea ARPA è la media dei soli comuni con una stazione (v. tooltip): la tabella confronta gli stessi comuni.'}
          </p>
          {c.coppie > 0 ? (
            <div className="tabella-scorre">
              <table className="tabella tabella-compatta">
                <caption>Concordanza sulle coppie comune × giorno con un valore in entrambe le fonti ({(c.comuni ?? []).join(', ')})</caption>
                <thead>
                  <tr>
                    <th scope="col">Coppia</th>
                    <th scope="col">Livello</th>
                    <th scope="col" className="num">Coppie</th>
                    <th scope="col" className="num">Scarto medio (ERA5 − ARPA)</th>
                    <th scope="col" className="num">Errore medio assoluto</th>
                    <th scope="col" className="num">Correlazione</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">
                      <span className="coppia"><Pallino colore={token['fonte-arpa']} />{c.fonte_b}<span aria-hidden="true">↔</span><Pallino colore={token['fonte-cams']} tratteggio />{c.fonte_a}</span>
                    </th>
                    <td className="nowrap">{c.livello}</td>
                    <td className="num">{numeroIntero(c.coppie)}</td>
                    <td className="num">{conSegno(c.bias)} {d.unita}</td>
                    <td className="num">{numero(c.errore_medio)} {d.unita}</td>
                    <td className="num">{numero(c.correlazione)}</td>
                  </tr>
                </tbody>
              </table>
              {d.soglie.length > 0 && (
                <table className="tabella tabella-compatta">
                  <caption>Giorni sopra le soglie di caldo, sulle stesse coppie comune × giorno</caption>
                  <thead>
                    <tr>
                      <th scope="col">Indicatore</th>
                      <th scope="col" className="num">{c.fonte_b}</th>
                      <th scope="col" className="num">{c.fonte_a}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.soglie.map((s) => (
                      <tr key={s.indicatore}>
                        <th scope="row">{s.descrizione}</th>
                        <td className="num">{numeroIntero(s.giorni_b)}</td>
                        <td className="num">{numeroIntero(s.giorni_a)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="nota-grafico">{c.nota}</p>
            </div>
          ) : (
            <p className="nota-grafico">Nessun confronto possibile: {c.nota}.</p>
          )}
        </>
      )}
    </Card>
  )
}
