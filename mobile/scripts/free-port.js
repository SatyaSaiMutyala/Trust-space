/*
 * Free a TCP port (default 8081, Metro's) by stopping whatever process is listening on it.
 *   node scripts/free-port.js [port]
 * Runs automatically before `npm start` (see package.json "prestart").
 */
const { execSync } = require('child_process')

const port = Number(process.argv[2]) || 8081
const run = cmd => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString() } catch { return '' } }

let pids = []
if (process.platform === 'win32') {
  pids = run(`netstat -ano -p tcp`)
    .split(/\r?\n/)
    .map(l => l.trim().split(/\s+/))
    .filter(c => c[1] && c[1].endsWith(`:${port}`) && c[3] === 'LISTENING')
    .map(c => c[4])
} else {
  pids = run(`lsof -ti tcp:${port} -sTCP:LISTEN`).split(/\s+/)
}
pids = [...new Set(pids.filter(p => p && p !== '0' && p !== String(process.pid)))]

if (!pids.length) {
  console.log(`Port ${port} is free.`)
} else {
  for (const pid of pids) {
    run(process.platform === 'win32' ? `taskkill /PID ${pid} /T /F` : `kill -9 ${pid}`)
    console.log(`Port ${port}: stopped process ${pid}.`)
  }
}
