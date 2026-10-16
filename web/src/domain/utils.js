/* Pure helpers ported verbatim from the TruSpace prototype (reference/TruSpace.html, "utilities"). */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
export const inr = n => '₹' + Math.round(+n || 0).toLocaleString('en-IN')
export const isoOf = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
export const TODAY = isoOf(new Date())
export const CUR = TODAY.slice(0, 7)
export function addMonths(s, m) { const d = new Date(s + 'T00:00:00'); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + m); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return isoOf(d) }
export function addDays(s, n) { const d = new Date(s + 'T00:00:00'); d.setDate(d.getDate() + n); return isoOf(d) }
export function daysTo(s) { return Math.round((new Date(s + 'T00:00:00') - new Date(TODAY + 'T00:00:00')) / 864e5) }
export const fmtD = s => s ? new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const fmtDT = s => s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
export function perAdd(p, n) { const [y, m] = p.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') }
export function perDiff(a, b) { const [y1, m1] = a.split('-').map(Number), [y2, m2] = b.split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1) }
export const perLabel = p => { if (!p) return '—'; const [y, m] = p.split('-'); return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export function fy(s) { const [y, m] = s.split('-').map(Number); const st = m >= 4 ? y : y - 1; return String(st).slice(2) + '-' + String(st + 1).slice(2) }
export const nowISO = () => new Date().toISOString()
export const by = (k, dir = 1) => (a, b) => (a[k] > b[k] ? 1 : a[k] < b[k] ? -1 : 0) * dir
export const num = v => v === '' || v == null ? 0 : +v
export const dayCount = (a, b) => Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 864e5) + 1
/** A co-owner's % share for display, at most 2 decimals: 58.8235 → "58.82%", 60 → "60%". */
export const pctLabel = v => (Math.round((+v || 0) * 100) / 100) + '%'
export const ordinal = n => n + ['th', 'st', 'nd', 'rd'][n % 10 > 3 || [11, 12, 13].includes(n) ? 0 : n % 10]
/** Rows → CSV text, every cell quoted (same format as the prototype's downloads). */
export const toCsv = rows => rows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
