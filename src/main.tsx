import '@fontsource-variable/manrope'
import 'leaflet/dist/leaflet.css'
import './stili/tema.css'
import './stili/app.css'

import { keepPreviousData, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import TooltipTitoli from './componenti/TooltipTitoli.tsx'
import { applicaTemaIniziale } from './stato/tema.ts'

applicaTemaIniziale()

// I dati cambiano solo quando si rigenera un dataset: niente refetch automatici in background.
// Mentre una richiesta è in corso ogni vista tiene i dati che aveva (keepPreviousData) e li sostituisce solo a
// caricamento completato: l'interfaccia resta usabile, il caricamento lo segnala la rotellina in alto a destra.
// I dati restano in memoria 30 minuti, così tornando a una tab o a una finestra già vista non si ricarica nulla.
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 5 * 60_000, gcTime: 30 * 60_000, refetchOnWindowFocus: false, retry: 1, placeholderData: keepPreviousData },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <App />
      <TooltipTitoli />
    </QueryClientProvider>
  </StrictMode>,
)
