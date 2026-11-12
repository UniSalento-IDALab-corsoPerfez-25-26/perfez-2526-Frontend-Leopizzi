// Quale card ha aperta la chat dell'assistente (31/10/2026, piano del modulo AI §9): una sola alla volta in tutta la
// pagina. Il pannello lo disegna la card stessa, che conosce il suo contesto (zone, mese, inquinante, fonte).

import { createContext, useContext } from 'react'

/** Card con l'assistente: lo stesso elenco di localhost/rag/schede.py (CARD). Dal 01/11/2026 (scelta di Matteo) anche
 *  cinque card oltre a «giorno per giorno», ognuna con la sua scheda dei fatti (passo 8 del piano), dal 03/11/2026 tutte
 *  le card con dati (le sette «istantanee», localhost/rag/schede_istantanee.py); il server dice
 *  quali card hanno una scheda dei fatti (`con_fatti` di /api/assistente/domande). */
export type CardAssistente = 'andamento' | 'domini' | 'consiglio' | 'anno_su_anno' | 'dettaglio_mese' | 'cambiamenti'
  // dal 03/11/2026 le card «istantanee» (localhost/rag/schede_istantanee.py): la carta risponde anche sulla zona in primo piano
  | 'mappa' | 'sintesi' | 'riepilogo' | 'fonti_aria' | 'fonti_decessi' | 'fonti_calore' | 'ricoveri'

interface StatoChat {
  aperta: CardAssistente | null
  apri: (card: CardAssistente | null) => void
  /** Il posto della chat nella finestra principale (01/11/2026): la chat vi si disegna e la pagina si stringe a sinistra. */
  colonna: HTMLElement | null
}

const ContestoChat = createContext<StatoChat>({ aperta: null, apri: () => {}, colonna: null })

export const ChatProvider = ContestoChat.Provider
export const useChat = () => useContext(ContestoChat)
