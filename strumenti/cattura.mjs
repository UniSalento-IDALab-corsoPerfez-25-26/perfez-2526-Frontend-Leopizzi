// Cattura della dashboard con Chrome headless via DevTools Protocol, per verificare le modifiche senza un browser
// integrato (28/10/2026). Uso, da localhost/dashboard/:
//   node strumenti/cattura.mjs [--vista] <url> <out.png> [larghezza] [altezza] ["<js da eseguire prima>"] [porta]
// Carica la pagina (~16 s), esegue il JS facoltativo (attende le promesse), cattura l'intera pagina e stampa i messaggi
// di console. Con --vista (29/10/2026) cattura solo la parte visibile: la pagina intera ridimensiona la vista, e
// carta, scheda della zona e barra laterale non restano come a schermo. Richiede Chrome in
// C:/Program Files/Google/Chrome/Application/.
import { spawn } from 'node:child_process'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const argomenti = process.argv.slice(2)
const vista = argomenti.includes('--vista')
const [url, out, w = '1600', h = '1100', js = '', porta = String(9400 + Math.floor(Math.random() * 400))] = argomenti.filter((a) => a !== '--vista')
const profilo = mkdtempSync(join(tmpdir(), 'cdp-'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars',
  `--window-size=${w},${h}`, `--remote-debugging-port=${porta}`, `--user-data-dir=${profilo}`, 'about:blank'])
const attesa = (ms) => new Promise((r) => setTimeout(r, ms))
await attesa(2500)
const lista = await (await fetch(`http://127.0.0.1:${porta}/json`)).json()
const ws = new WebSocket(lista.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r))
let id = 0
const pend = new Map()
const log = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.method === 'Runtime.consoleAPICalled') log.push(m.params.args.map((a) => a.value ?? a.description).join(' '))
  if (pend.has(m.id)) { pend.get(m.id)(m.result ?? m.error); pend.delete(m.id) }
})
const cmd = (method, params = {}) => new Promise((r) => { pend.set(++id, r); ws.send(JSON.stringify({ id, method, params })) })
await cmd('Page.enable')
await cmd('Runtime.enable')
await cmd('Page.navigate', { url })
await attesa(16000)
if (js) {
  const r = await cmd('Runtime.evaluate', { expression: js, awaitPromise: true, returnByValue: true })
  if (r?.result?.value !== undefined) console.log(typeof r.result.value === 'string' ? r.result.value : JSON.stringify(r.result.value))
  await attesa(3000)
}
const shot = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !vista })
writeFileSync(out, Buffer.from(shot.data, 'base64'))
if (log.length) console.log('--- console ---\n' + log.join('\n'))
ws.close()
chrome.kill()
