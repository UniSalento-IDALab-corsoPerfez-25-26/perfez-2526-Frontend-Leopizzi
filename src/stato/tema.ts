// Tema chiaro (come flux di Nixtio) e scuro, scelto dall'utente con l'interruttore nella barra laterale.
// Il primo avvio segue l'impostazione del sistema operativo; la scelta resta in localStorage (solo una comodità
// del singolo browser: se lo storage non è disponibile la pagina funziona lo stesso).

export type Tema = 'chiaro' | 'scuro'

const CHIAVE = 'onehealth.tema'

function salvato(): Tema | null {
  try {
    const v = localStorage.getItem(CHIAVE)
    return v === 'chiaro' || v === 'scuro' ? v : null
  } catch {
    return null
  }
}

/** Ordine: `?tema=chiaro|scuro` nell'indirizzo, poi la scelta salvata, poi l'impostazione del sistema. */
export function temaIniziale(): Tema {
  const daUrl = new URLSearchParams(window.location.search).get('tema')
  if (daUrl === 'chiaro' || daUrl === 'scuro') return daUrl
  return salvato() ?? (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro')
}

export function applicaTema(tema: Tema) {
  document.documentElement.dataset.tema = tema
  try {
    localStorage.setItem(CHIAVE, tema)
  } catch {
    /* storage non disponibile: la scelta vale solo per questa sessione */
  }
}

export function applicaTemaIniziale() {
  document.documentElement.dataset.tema = temaIniziale()
}
