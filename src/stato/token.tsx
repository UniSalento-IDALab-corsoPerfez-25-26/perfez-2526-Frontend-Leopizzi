// Tema attivo e colori risolti. Leaflet e Recharts scrivono i colori come attributi SVG, dove le variabili CSS
// non valgono: qui si leggono i valori calcolati delle variabili di tema.css ogni volta che cambia il tema.

import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react'

import { applicaTema, temaIniziale, type Tema } from './tema'

const NOMI = [
  'testo', 'testo-2', 'testo-3', 'card', 'card-2', 'linea', 'griglia', 'asse',
  'zona-1', 'zona-2', 'zona-3', 'zona-4', 'fonte-arpa', 'fonte-openaq', 'fonte-eea', 'fonte-cams',
  'rampa-1', 'rampa-2', 'rampa-3', 'rampa-4', 'rampa-5',
  'calore-1', 'calore-2', 'calore-3', 'calore-4', 'calore-5',
  'alberi-1', 'alberi-2', 'alberi-3', 'alberi-4', 'alberi-5',
  'suolo-1', 'suolo-2', 'suolo-3', 'suolo-4', 'suolo-5',
  'salute-1', 'salute-2', 'salute-3', 'salute-4', 'salute-5',
  'mappa-bordo', 'mappa-null', 'mappa-nodata', 'mappa-selezione', 'mappa-fuori', 'lime',
  'salubrita-buona', 'salubrita-accettabile', 'salubrita-scadente', 'salubrita-cattiva', 'salubrita-nc',
] as const
export type NomeToken = (typeof NOMI)[number]
export type Token = Record<NomeToken, string>

function leggiToken(): Token {
  const stile = getComputedStyle(document.documentElement)
  return Object.fromEntries(NOMI.map((n) => [n, stile.getPropertyValue(`--${n}`).trim()])) as Token
}

interface ContestoTema {
  tema: Tema
  cambiaTema: () => void
  token: Token
}

const Contesto = createContext<ContestoTema | null>(null)

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaIniziale)
  const [token, setToken] = useState<Token>(leggiToken)
  useLayoutEffect(() => {
    applicaTema(tema)
    setToken(leggiToken())
  }, [tema])
  const cambiaTema = () => setTema((t) => (t === 'chiaro' ? 'scuro' : 'chiaro'))
  return <Contesto.Provider value={{ tema, cambiaTema, token }}>{children}</Contesto.Provider>
}

export function useTema(): ContestoTema {
  const c = useContext(Contesto)
  if (!c) throw new Error('useTema fuori da TemaProvider')
  return c
}

/** Colore di una fonte dell'aria (ARPA è una serie a sé, le altre formano il gruppo di validazione). */
export function coloreFonte(token: Token, fonte: string): string {
  const k = `fonte-${fonte.toLowerCase()}` as NomeToken
  return token[k] ?? token['testo-2']
}
