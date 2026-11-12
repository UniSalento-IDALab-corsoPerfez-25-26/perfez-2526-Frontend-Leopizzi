import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// Tutto in locale: la dashboard su 127.0.0.1:5173, le chiamate /api girate al server del Backend
// (uv run localhost/server/main.py, di default 127.0.0.1:8000), così il browser parla con una sola origine.
// Le due destinazioni si cambiano dall'ambiente o da un file `.env` (v. `.env.example`), senza toccare il codice.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: Number(env.ONEHEALTH_DASHBOARD_PORT || 5173),
      strictPort: true,
      open: true, // `npm run dev` apre da solo il browser sulla dashboard
      proxy: { '/api': env.ONEHEALTH_API_URL || 'http://127.0.0.1:8000' },
    },
  }
})
