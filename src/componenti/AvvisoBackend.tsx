// Avviso all'avvio sullo stato del server dei dati (Backend), chiamando GET /api/stato (piano dei tre repository, F0.11):
// server non raggiungibile, server avviato ma senza dati, versione dell'API diversa da quella attesa. Chi clona i due repository
// capisce subito cosa manca. I comandi stanno solo nel README del Backend, qui solo la frase e il link.

import type { ReactNode } from 'react'

import { VERSIONE_API_ATTESA } from '../api/client'
import { useStatoServer } from '../stato/dati'

const ORGANIZZAZIONE = 'https://github.com/UniSalento-IDALab-corsoPerfez-25-26'
const REPO_BACKEND = `${ORGANIZZAZIONE}/perfez-2526-Backend-Leopizzi`

function Avviso({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <main className="principale">
      <div className="vuoto vuoto-errore" role="alert">
        <strong>{titolo}</strong>
        <p>{children}</p>
      </div>
    </main>
  )
}

const LinkBackend = ({ ancora, testo }: { ancora?: string; testo: string }) => (
  <a href={REPO_BACKEND + (ancora ? `#${ancora}` : '')} target="_blank" rel="noopener noreferrer">{testo}</a>
)

/** Mostra l'avviso giusto al posto della dashboard se il server non c'è o è vuoto; con una versione diversa avvisa ma lascia lavorare. */
export default function AvvisoBackend({ children }: { children: ReactNode }) {
  const stato = useStatoServer()
  if (stato.isPending) return null
  if (stato.isError) {
    // 404: un server senza /api/stato è di una versione precedente; qualunque altro errore: non risponde
    const vecchio = stato.error instanceof Error && 'stato' in stato.error && stato.error.stato === 404
    if (!vecchio) {
      return (
        <Avviso titolo="Server dei dati non raggiungibile">
          Il server locale non risponde: probabilmente non è avviato. Come avviarlo: README del repository <LinkBackend testo="Backend" />.
        </Avviso>
      )
    }
    return (
      <Avviso titolo="Versione del server diversa">
        Il server risponde ma è di una versione precedente: questa dashboard aspetta la versione {VERSIONE_API_ATTESA} dell'API.
        Aggiorna il repository <LinkBackend testo="Backend" />.
      </Avviso>
    )
  }
  if (!stato.data.con_dati) {
    return (
      <Avviso titolo="Server avviato, ma senza dati">
        Il server funziona ma non ha ancora scaricato nessun dato. Come scaricarli: sezione «Dati» del README del repository{' '}
        <LinkBackend ancora="dati" testo="Backend" />.
      </Avviso>
    )
  }
  const diversa = stato.data.versione_api !== VERSIONE_API_ATTESA
  return (
    <>
      {diversa && (
        <p className="avvertenza" role="status">
          La versione dell'API del server ({stato.data.versione_api}) è diversa da quella attesa da questa dashboard ({VERSIONE_API_ATTESA}):
          qualcosa potrebbe non funzionare. Versioni abbinate: README del repository <LinkBackend testo="Backend" />.
        </p>
      )}
      {children}
    </>
  )
}
