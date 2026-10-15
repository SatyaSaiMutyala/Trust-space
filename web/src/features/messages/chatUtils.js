/* Date/name helpers for the chat UI. */
import { TODAY, addDays, fmtD } from '../../domain/utils'

export const initials = name => String(name || '?').replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?'
export const timeOf = iso => iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''
/** Local calendar day (YYYY-MM-DD) of an ISO timestamp. */
export const dayOf = iso => iso ? new Date(iso).toLocaleDateString('en-CA') : ''
export function dayLabel(day) {
  if (day === TODAY) return 'Today'
  if (day === addDays(TODAY, -1)) return 'Yesterday'
  return fmtD(day)
}
/** Short "when" for the conversation list: time today, weekday this week, else date. */
export function shortWhen(iso) {
  if (!iso) return ''
  const d = dayOf(iso)
  if (d === TODAY) return timeOf(iso)
  if (d === addDays(TODAY, -1)) return 'Yesterday'
  if (d > addDays(TODAY, -7)) return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short' })
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
