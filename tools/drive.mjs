// Drive the dev app in headless Chrome and report errors.
//   node --experimental-websocket tools/drive.mjs "<query>" <out.png> [width=1400] [height=1000] [jsStep ...]
// Each jsStep runs in the page (after load, then 1.2 s apart). Prints console errors and uncaught exceptions.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const [q, out, w = '1400', h = '1000', ...steps] = process.argv.slice(2)
const port = 9300 + Math.floor(Math.random() * 500)
const dir = mkdtempSync(join(tmpdir(), 'drive'))
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, 'about:blank'], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))
let tabs
for (let i = 0; i < 50; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.find(t => t.type === 'page')) break } catch { /* starting */ } await sleep(200) }
const ws = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl)
await new Promise(r => ws.addEventListener('open', r))
let id = 0; const pend = {}
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data)
  if (m.id && pend[m.id]) { pend[m.id](m); delete pend[m.id] }
  if (m.method === 'Runtime.exceptionThrown') console.log('EXCEPTION:', m.params.exceptionDetails.exception?.description?.split('\n').slice(0, 6).join('\n  ') || m.params.exceptionDetails.text)
  if (m.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(m.params.type)) console.log('CONSOLE.' + m.params.type + ':', m.params.args.map(a => a.value ?? a.description ?? '').join(' ').split('\n').slice(0, 8).join('\n  '))
})
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend[i] = r; ws.send(JSON.stringify({ id: i, method, params })) })
try {
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: +w, height: +h, deviceScaleFactor: 1, mobile: +w < 800 })
  await send('Page.navigate', { url: 'http://localhost:5173/?' + q })
  await sleep(3000)
  for (const s of steps) {
    const r = await send('Runtime.evaluate', { expression: s, awaitPromise: true, returnByValue: true })
    if (r.result?.result?.value !== undefined) console.log('step:', JSON.stringify(r.result.result.value))
    if (r.result?.exceptionDetails) console.log('step error:', r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text)
    await sleep(1200)
  }
  const len = await send('Runtime.evaluate', { expression: 'document.getElementById("root").innerText.length', returnByValue: true })
  console.log('root text length:', len.result?.result?.value)
  const shot = await send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'))
} finally { ws.close(); chrome.kill(); await sleep(500); try { rmSync(dir, { recursive: true, force: true }) } catch { /* locked */ } }
process.exit(0)
