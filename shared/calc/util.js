/* Pure date, period, number and CSV helpers shared by the web app and the API. No globals, no "today" — callers pass dates in. */
export const isoOf = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
export function addMonths(s, m) { const d = new Date(s + 'T00:00:00'); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + m); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return isoOf(d) }
export function addDays(s, n) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
/** Whole days from `from` to `s` (negative when `s` is earlier). */
export function daysFrom(from, s) { return Math.round((new Date(s + 'T00:00:00') - new Date(from + 'T00:00:00')) / 864e5) }
export const dayCount = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5) + 1
export function perAdd(p, n) { const [y, m] = p.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
export function perDiff(a, b) { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1) }
export const perLabel = p => { if (!p) return '—'; const [y, m] = p.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }
export function fy(s) { const [y, m] = s.split('-').map(Number); const st = m >= 4 ? y : y - 1; return String(st).slice(2) + '-' + String(st + 1).slice(2) }
export const fmtD = s => s ? new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN')
export const by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir
export const num = v => v === '' || v == null ? 0 : +v
/** Rows → CSV text, every cell quoted (same format as the prototype's downloads). */
export const toCsv = rows => rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
