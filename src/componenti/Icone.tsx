// Icone della dashboard, disegnate in SVG con lo stesso tratto (1.8, estremi arrotondati) e lo stesso riquadro 24×24.
// Nate per la barra laterale (19/10/2026); dal 29/10/2026 (fase 3 della revisione, scelte di Matteo) sono il sistema
// unico: un'icona per dominio (le stesse delle particelle della scheda), una per azione al posto dei caratteri + ✓ × ↓,
// e una per stato del dato (simulato, modellato, N/D, null) al posto delle parole. Tutte a `currentColor`.

import type { ReactNode } from 'react'

/** `dim` in px: 18 nella barra laterale, 14-16 accanto al testo. */
function Icona({ children, dim = 18 }: { children: ReactNode; dim?: number }) {
  return (
    <svg className="icona" width={dim} height={dim} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}
type Dim = { dim?: number }

export const IconaMappa = () => <Icona><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" /><path d="M9 4v13.5M15 6.5V20" /></Icona>
export const IconaFonti = () => <Icona><path d="M3 20h18" /><path d="m4 15 5-6 4 4 7-8" /><path d="m4 17 5-3 4 1 7-4" strokeDasharray="2 2.5" /></Icona>
export const IconaRiepilogo = () => <Icona><rect x="3" y="4.5" width="18" height="15" rx="2" /><path d="M3 9.5h18M9 9.5v10" /></Icona>
export const IconaStagionalita = () => <Icona><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M7.5 14h2M11 14h2M14.5 14h2M7.5 17h2" /></Icona>
export const IconaInformazioni = () => <Icona><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><path d="M12 7.6v.1" strokeWidth="2.4" /></Icona>
export const IconaLuna = () => <Icona><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" /></Icona>
export const IconaSole = () => <Icona><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></Icona>
/** Marchio (19/10/2026, scelta di Matteo fra quattro alternative): un cuore aperto in alto a destra da cui escono tre
 *  particelle sospese, il PM delle centraline, cioè l'aria che arriva al corpo. Stesso disegno di public/favicon.svg,
 *  su griglia 32×32; il quadrato lime è lo sfondo di .marchio-segno. */
export const IconaMarchio = ({ dim = 34 }: Dim = {}) => (
  <svg width={dim} height={dim} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path d="M21 9.6c-1.9 0-3.6 1-5 2.9-1.4-1.9-3.1-2.9-5-2.9-3 0-5 2.4-5 5.4 0 4.8 5.2 8.5 10 11.6 3.6-2.3 7.4-5 9.1-8.4" />
    <g fill="currentColor" stroke="none">
      <circle cx="24.6" cy="7.6" r="1.3" /><circle cx="27.4" cy="12" r="1.1" /><circle cx="22.2" cy="4.4" r=".9" />
    </g>
  </svg>
)

/** Particelle della scheda della zona (28-29/10/2026): una per vista colore della mappa, più la salute. */
export const IconaAria = ({ dim }: Dim = {}) => <Icona dim={dim}><path d="M3 9h10.5a2.75 2.75 0 1 0-2.75-2.75" /><path d="M3 13h15.5a2.75 2.75 0 1 1-2.75 2.75" /><path d="M3 17h6" /></Icona>
export const IconaSalubrita = ({ dim }: Dim = {}) => <Icona dim={dim}><path d="M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></Icona>
export const IconaCalore = ({ dim }: Dim = {}) => <Icona dim={dim}><path d="M14 13.8V5a2 2 0 0 0-4 0v8.8a4 4 0 1 0 4 0z" /><path d="M12 9v7" /></Icona>
export const IconaAlberi = ({ dim }: Dim = {}) => <Icona dim={dim}><path d="M12 21v-5" /><path d="M12 3c-2.8 0-4.8 2.2-4.8 4.8 0 .5.1 1 .2 1.4A3.4 3.4 0 0 0 8.2 16h7.6a3.4 3.4 0 0 0 .8-6.8c.1-.4.2-.9.2-1.4C16.8 5.2 14.8 3 12 3z" /></Icona>
export const IconaSuolo = ({ dim }: Dim = {}) => <Icona dim={dim}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9.3h18M3 14.7h18M9 4v5.3M15 9.3v5.4M9 14.7V20" /></Icona>
export const IconaSalute = ({ dim }: Dim = {}) => <Icona dim={dim}><path d="M3 12h4l2-5 4 10 2.5-6 1.5 1h4" /></Icona>

/** Occhio della scheda della zona (29/10/2026): aperto = scheda visibile. Per chiuderlo la palpebra di sopra si ribalta
 *  su quella di sotto, la pupilla si schiaccia e compaiono le ciglia (animazione in app.css, .icona-occhio). */
export const IconaOcchio = ({ chiuso }: { chiuso: boolean }) => (
  <svg className={`icona icona-occhio${chiuso ? ' chiuso' : ''}`} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    <path className="palpebra" d="M2.5 12c2.2-4 5.5-6 9.5-6s7.3 2 9.5 6" />
    <path d="M2.5 12c2.2 4 5.5 6 9.5 6s7.3-2 9.5-6" />
    <circle className="pupilla" cx="12" cy="12" r="2.8" />
    <path className="ciglia" d="M6.6 16.4 5.3 18.4M12 18v2.4M17.4 16.4l1.3 2" />
  </svg>
)

/** Stati del dato (29/10/2026): stanno su un pallino del colore dello stato (`Segno` in comuni.tsx), il perché nel tooltip.
 *  Simulato = beuta da laboratorio (generato da un modello, non osservato); modellato = cubo in fil di ferro (un modello
 *  su griglia, non una misura); N/D = divieto (la fonte non copre la zona); null = punto esclamativo (la fonte la copre
 *  ma il valore non è utilizzabile). */
export const IconaSimulato = ({ dim }: Dim = {}) => <Icona dim={dim}><path d="M9 3h6M10 3v6.2l-5.4 9.3A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.5L14 9.2V3" /><path d="M7.3 15h9.4" /></Icona>
export const IconaModellato = ({ dim }: Dim = {}) => <Icona dim={dim}><path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4z" /><path d="m4 7.4 8 4.6 8-4.6M12 12v9.2" /></Icona>
export const IconaDivieto = ({ dim }: Dim = {}) => <Icona dim={dim}><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></Icona>
export const IconaNonUtilizzabile = ({ dim }: Dim = {}) => <Icona dim={dim}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V13" /><path d="M12 16.4v.1" strokeWidth="2.6" /></Icona>

/** Azioni (29/10/2026): al posto dei caratteri di testo nei pulsanti. */
export const IconaPiu = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M12 5v14M5 12h14" /></Icona>
export const IconaSpunta = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icona>
export const IconaChiudi = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M6.5 6.5l11 11M17.5 6.5l-11 11" /></Icona>
/** Ricerca di distretti e comuni sulla carta (29/10/2026). */
export const IconaCerca = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" /></Icona>
export const IconaScarica = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14" /></Icona>
export const IconaUltimi = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M4 12h12M11 7l5 5-5 5M20 5v14" /></Icona>
export const IconaMeseCompleto = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /><path d="m9 15 2 2 4-4" /></Icona>
/** Dati della finestra (29/10/2026): i domini come strati sovrapposti della stessa carta. */
export const IconaStrati = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="m12 3.5 8.5 4.25-8.5 4.25-8.5-4.25z" /><path d="M3.5 12 12 16.25 20.5 12" /><path d="M3.5 16.25 12 20.5l8.5-4.25" /></Icona>
export const IconaGuida = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M12 6.5C10.2 5.2 7.8 4.6 4 4.8v13.4c3.8-.2 6.2.4 8 1.7 1.8-1.3 4.2-1.9 8-1.7V4.8c-3.8-.2-6.2.4-8 1.7zM12 6.5v13.4" /></Icona>
export const IconaSvuota = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13" /></Icona>
/** Copia negli appunti (chat dell'assistente, 01/11/2026). */
export const IconaCopia = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><rect x="8.5" y="8.5" width="11.5" height="11.5" rx="2" /><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5" /></Icona>
/** Porta a un blocco più in basso nella pagina (consiglio di Stagionalità, 29/10/2026). */
export const IconaScendi = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M12 5v13" /><path d="m6.5 12.5 5.5 5.5 5.5-5.5" /></Icona>
/** Apre un gruppo di righe (Stagionalità, 29/10/2026): la punta guarda a destra da chiuso e ruota in giù da aperto (app.css). */
export const IconaApri = ({ dim = 14 }: Dim = {}) => <Icona dim={dim}><path d="m9.5 6 6 6-6 6" /></Icona>

/** Andamento sugli anni precedenti (Stagionalità, 29/10/2026): al posto di ▲ ▼ =. */
export const IconaAumento = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M6 18 18 6" /><path d="M9.5 6H18v8.5" /></Icona>
export const IconaCalo = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M6 6l12 12" /><path d="M18 9.5V18H9.5" /></Icona>
export const IconaStabile = ({ dim = 16 }: Dim = {}) => <Icona dim={dim}><path d="M4.5 12h14" /><path d="m14.5 8 4 4-4 4" /></Icona>

/** Barra laterale: pannello con la colonna a sinistra; la freccia indica che cosa succede al clic. */
export const IconaBarra = ({ chiusa }: { chiusa: boolean }) => (
  <Icona>
    <rect x="3" y="4" width="18" height="16" rx="2.5" /><path d="M9 4v16" />
    <path d={chiusa ? 'm13.5 10 2 2-2 2' : 'm15.5 10-2 2 2 2'} />
  </Icona>
)

/** L'icona del dominio di un nome o di un id che viene dal server («Aria da ARPA», «Salute simulata…», «pronto_soccorso»,
 *  «aria:PM2.5»), o null se non è di un dominio (territorio, sintesi). Un'icona = un dominio, in tutta la pagina. */
export function iconaDominio(nome: string | null | undefined): ((p: Dim) => ReactNode) | null {
  const n = (nome ?? '').toLowerCase()
  if (n.startsWith('salubr')) return IconaSalubrita
  if (n.startsWith('aria')) return IconaAria
  if (n.startsWith('calore') || n.startsWith('temperatura')) return IconaCalore
  if (n.startsWith('alberi') || n.startsWith('chioma')) return IconaAlberi
  if (n.startsWith('suolo')) return IconaSuolo
  if (/^(salute|decessi|ricoveri|pronto|ps|adi)/.test(n)) return IconaSalute
  return null
}
