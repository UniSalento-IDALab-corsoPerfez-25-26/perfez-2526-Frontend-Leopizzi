// Rigenera src/api/schema.d.ts dallo schema OpenAPI del Backend (il contratto fra i due repository).
//   npm run tipi                                  → dal server acceso, all'indirizzo di ONEHEALTH_API_URL
//   npm run tipi:file -- ../Backend/docs/openapi.json   → dal file del Backend clonato accanto, a server spento
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

function leggiEnv() {
  if (!existsSync('.env')) return {}
  return Object.fromEntries(
    readFileSync('.env', 'utf8').split(/\r?\n/)
      .map((r) => r.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
  )
}

const argomento = process.argv[2]
let sorgente
if (argomento) {
  if (!existsSync(argomento)) {
    console.error(`File non trovato: ${argomento}. Serve il docs/openapi.json del Backend clonato accanto.`)
    process.exit(1)
  }
  sorgente = argomento
} else {
  const base = process.env.ONEHEALTH_API_URL || leggiEnv().ONEHEALTH_API_URL || 'http://127.0.0.1:8000'
  sorgente = `${base.replace(/\/$/, '')}/openapi.json`
}

const r = spawnSync('npx', ['openapi-typescript', sorgente, '-o', 'src/api/schema.d.ts'], { stdio: 'inherit', shell: true })
process.exit(r.status ?? 1)
