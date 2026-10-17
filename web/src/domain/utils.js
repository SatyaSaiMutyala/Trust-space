/* Helpers for the web app. The pure date/number/CSV helpers live in shared/calc/util.js (used by the API too); this adds
   "today"-based and UI-only ones. */
export { isoOf, addMonths, addDays, dayCount, perAdd, perDiff, perLabel, fy, fmtD, inr, by, num, toCsv } from '@calc/util.js'
import { isoOf, daysFrom } from '@calc/util.js'

export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
export const TODAY = isoOf(new Date())
export const CUR = TODAY.slice(0, 7)
export function daysTo(s) { return daysFrom(TODAY, s) }
export const fmtDT = s => s ? new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
export const nowISO = () => new Date().toISOString()
/** A co-owner's % share for display, at most 2 decimals: 58.8235 → "58.82%", 60 → "60%". */
export const pctLabel = v => (Math.round((+v || 0) * 100) / 100) + '%'
export const ordinal = n => n + ['th', 'st', 'nd', 'rd'][n % 10 > 3 || [11, 12, 13].includes(n) ? 0 : n % 10]
