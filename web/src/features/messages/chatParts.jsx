/* Building blocks for the chat UI: avatars, date separators, message bubbles, icons. */
import Box from '@mui/material/Box'
import { initials, timeOf, dayLabel } from './chatUtils'
import { PhotoStrip } from '../../components/ui/Media'

const COLORS = ['#1d7a3e', '#2a5f9e', '#a86b0c', '#7b4fa0', '#c03d12', '#0f766e', '#5b6b2f']
const hash = s => [...String(s || '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
export function Avatar({ name, size = 40 }) {
  return (
    <Box aria-hidden="true" sx={{ width: size, height: size, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', bgcolor: COLORS[hash(name) % COLORS.length], color: '#fff', font: `600 ${Math.round(size * 0.38)}px var(--f-body)`, letterSpacing: '.02em' }}>
      {initials(name)}
    </Box>
  )
}

export function DateDivider({ day }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 1, color: 'var(--muted)', fontSize: 11.5, fontWeight: 600, letterSpacing: '.04em', '&::before,&::after': { content: '""', flex: 1, height: '1px', bgcolor: 'var(--line)' } }}>
      <Box component="span" sx={{ px: 1.25, py: 0.25, borderRadius: 999, bgcolor: 'var(--surface)', border: '1px solid var(--line)' }}>{dayLabel(day)}</Box>
    </Box>
  )
}

const svg = { width: 18, height: 18, fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
export const SendIcon = () => <svg viewBox="0 0 24 24" style={svg} aria-hidden="true"><path d="M22 2 11 13" /><path d="M22 2 15 22l-4-9-9-4z" /></svg>
export const ClipIcon = () => <svg viewBox="0 0 24 24" style={svg} aria-hidden="true"><path d="m21.4 11.1-9.2 9.2a6 6 0 0 1-8.5-8.5l9.2-9.2a4 4 0 0 1 5.7 5.7l-9.2 9.2a2 2 0 0 1-2.8-2.8l8.5-8.5" /></svg>
export const SearchIcon = () => <svg viewBox="0 0 24 24" style={{ ...svg, width: 16, height: 16 }} aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
export const ChatIcon = () => <svg viewBox="0 0 24 24" style={{ ...svg, width: 40, height: 40, strokeWidth: 1.4 }} aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z" /></svg>

/**
 * One message. mine = sent by this side (right, green). first/last = position inside a run of messages from the
 * same sender (name shown on the first, time and avatar on the last). Notices and approval requests render as cards.
 */
export function Bubble({ m, mine, first, last, seen }) {
  const formal = m.kind && m.kind !== 'Message'
  const meta = (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 0.75, mt: 0.5, fontSize: 11, color: mine && !formal ? 'rgb(255 255 255 / .8)' : 'var(--muted)' }}>
      <span>{timeOf(m.at)}</span>
      {mine ? <span title={seen ? 'Read' : 'Sent'} style={{ letterSpacing: '-2px', color: seen && !formal ? '#bff0cf' : undefined }}>{seen ? '✓✓' : '✓'}</span> : null}
    </Box>
  )
  return (
    <Box sx={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', gap: 1, alignItems: 'flex-end', mt: first ? 1.25 : 0.375 }}>
      {!mine ? <Box sx={{ width: 32, flex: 'none' }}>{last ? <Avatar name={m.by} size={32} /> : null}</Box> : null}
      <Box sx={{ maxWidth: { xs: '85%', md: '68%' }, minWidth: 0, display: 'grid', justifyItems: mine ? 'end' : 'start' }}>
        {first && !mine ? <Box sx={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', mb: 0.5, ml: 0.5 }}>{m.by}</Box> : null}
        {formal ? (
          <Box sx={{ bgcolor: 'var(--surface)', border: '1px solid color-mix(in srgb,var(--warn) 45%,var(--line))', borderLeft: '4px solid var(--warn)', borderRadius: '12px', px: 1.75, py: 1.25, boxShadow: '0 1px 2px rgb(20 40 25 / .06)', minWidth: 220 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75, color: 'var(--warn)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
              {m.kind === 'Notice' ? '📜' : '✅'} {m.kind}{mine ? '' : ` · from ${m.by}`}
            </Box>
            <Box sx={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.55 }}>{m.text}</Box>
            {(m.files || []).length ? <Box sx={{ mt: 1 }}><PhotoStrip files={m.files} /></Box> : null}
            {meta}
          </Box>
        ) : (
          <Box sx={{
            px: 1.75, py: 1.1, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
            borderRadius: '18px', boxShadow: '0 1px 2px rgb(20 40 25 / .08)',
            ...(mine
              ? { bgcolor: 'var(--accent)', color: 'var(--accent-ink)', borderBottomRightRadius: last ? '6px' : '18px' }
              : { bgcolor: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)', borderBottomLeftRadius: last ? '6px' : '18px' }),
          }}>
            {m.text}
            {(m.files || []).length ? <Box sx={{ mt: 1 }}><PhotoStrip files={m.files} /></Box> : null}
            {meta}
          </Box>
        )}
      </Box>
    </Box>
  )
}
