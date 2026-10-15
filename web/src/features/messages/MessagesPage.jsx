/*
 * Messages: chat window with a searchable conversation list and the open thread (prototype viewMessages).
 * Desktop/tablet: two panes side by side, filling the screen height. Phones: one pane at a time (UI.convOpen).
 */
import { useLayoutEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import InputBase from '@mui/material/InputBase'
import { S, UI, isOwner, owner, side, scopeProps, useStore } from '../../store/store'
import { by } from '../../domain/utils'
import { PageHead, Stack, Empty } from '../../components/ui/Layout'
import { SampleBanner } from '../../components/app/Banners'
import ThreadPanel from './ThreadPanel'
import { Avatar, SearchIcon } from './chatParts'
import { shortWhen } from './chatUtils'
import { selectConv } from './actions'

const PHONE = '@media (max-width:760px)'

export default function MessagesPage() {
  useStore()
  const [q, setQ] = useState('')
  /* Fit the chat window to the space left on screen (below the page header, above the phone tab bar). */
  const boxRef = useRef(null)
  const [h, setH] = useState(null)
  useLayoutEffect(() => {
    const fit = () => {
      const el = boxRef.current; if (!el) return
      const top = el.getBoundingClientRect().top + window.scrollY
      const gap = window.innerWidth <= 760 ? 64 + 12 : 24
      setH(Math.max(window.innerWidth <= 760 ? 420 : 560, window.innerHeight - top - gap))
    }
    fit(); window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit)
  }, [])
  const props = scopeProps().filter(p => p.status !== 'Pipeline' || S.messages.some(m => m.propertyId === p.id))
  const s = side()
  const last = pid => S.messages.filter(m => m.propertyId === pid).sort(by('at', -1))[0]
  props.sort((a, b) => (last(b.id)?.at || '').localeCompare(last(a.id)?.at || ''))
  if (!UI.conv || !props.find(p => p.id === UI.conv)) UI.conv = props[0]?.id
  const unreadOf = pid => S.messages.filter(x => x.propertyId === pid && x.from !== s && !(x.read || {})[s]).length
  const totalUnread = props.reduce((n, p) => n + unreadOf(p.id), 0)
  const needle = q.trim().toLowerCase()
  const shown = needle ? props.filter(p => [p.name, p.code, owner(p.ownerId)?.name, last(p.id)?.text].join(' ').toLowerCase().includes(needle)) : props

  return (
    <Stack>
      <PageHead title="Messages" sub={isOwner() ? 'Everything between you and TrustLab, property by property. Formal notices are marked.' : 'One thread per property with its owner. Notices sent here are timestamped and kept on record.'} />
      <SampleBanner />
      {props.length ? (
        <Box ref={boxRef} sx={{
          display: 'grid', gridTemplateColumns: { xs: 'minmax(0,1fr)', md: '340px minmax(0,1fr)', lg: '370px minmax(0,1fr)' },
          height: h ? h + 'px' : 'max(600px, calc(100vh - 230px))', bgcolor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)',
          '@media (min-width:761px) and (max-width:899px)': { gridTemplateColumns: '280px minmax(0,1fr)' },
          [PHONE]: { gridTemplateColumns: 'minmax(0,1fr)' },
        }}>
          {/* Conversation list */}
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: '1px solid var(--line)', [PHONE]: { display: UI.convOpen ? 'none' : 'flex', borderRight: 0 } }}>
            <Box sx={{ px: 2, pt: 2, pb: 1.25, borderBottom: '1px solid var(--line)' }}>
              <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', mb: 1.25 }}>
                <h2>Conversations</h2>
                <span className="small muted">{totalUnread ? <b style={{ color: 'var(--bad)' }}>{totalUnread} unread</b> : `${props.length} properties`}</span>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 1.5, height: 40, borderRadius: '20px', bgcolor: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--muted)', '&:focus-within': { borderColor: 'var(--accent)' } }}>
                <SearchIcon />
                <InputBase value={q} onChange={e => setQ(e.target.value)} placeholder="Search property, owner or message" inputProps={{ 'aria-label': 'Search conversations' }} sx={{ flex: 1, fontSize: 13.5, [PHONE]: { fontSize: 16 } }} />
              </Box>
            </Box>
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              {shown.map(p => {
                const m = last(p.id); const u = unreadOf(p.id); const cur = UI.conv === p.id
                const who = isOwner() ? p.code : owner(p.ownerId)?.name || ''
                return (
                  <Box component="button" type="button" key={p.id} onClick={() => selectConv(p.id)} aria-current={cur ? 'true' : undefined}
                    sx={{ all: 'unset', boxSizing: 'border-box', width: '100%', cursor: 'pointer', display: 'flex', gap: 1.5, alignItems: 'center', px: 2, py: 1.5, position: 'relative', borderBottom: '1px solid color-mix(in srgb,var(--line) 60%,transparent)',
                      bgcolor: cur ? 'color-mix(in srgb,var(--accent) 9%,transparent)' : 'transparent', '&:hover': { bgcolor: cur ? undefined : 'var(--bg)' },
                      '&::before': cur ? { content: '""', position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: '0 3px 3px 0', bgcolor: 'var(--accent)' } : {},
                      '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: '-2px' } }}>
                    <Avatar name={p.name} size={44} />
                    <Box sx={{ minWidth: 0, flex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: '2px' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                        <Box component="b" sx={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 14 }}>{p.name}</Box>
                        <Box component="span" sx={{ fontSize: 11.5, flex: 'none', color: u ? 'var(--accent)' : 'var(--muted)', fontWeight: u ? 600 : 400 }}>{shortWhen(m?.at)}</Box>
                      </Box>
                      <Box sx={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{who}</Box>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Box sx={{ flex: 1, minWidth: 0, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: u ? 'var(--ink)' : 'var(--muted)', fontWeight: u ? 600 : 400 }}>
                          {m ? <>{m.from === s ? 'You: ' : ''}{m.kind !== 'Message' ? `[${m.kind}] ` : ''}{m.text}</> : <i>No messages yet</i>}
                        </Box>
                        {u ? <Box component="span" sx={{ flex: 'none', minWidth: 20, height: 20, px: 0.75, borderRadius: 10, bgcolor: 'var(--accent)', color: 'var(--accent-ink)', fontSize: 11, fontWeight: 700, display: 'grid', placeItems: 'center' }}>{u}</Box> : null}
                      </Box>
                    </Box>
                  </Box>
                )
              })}
              {!shown.length ? <div className="empty">No conversations match “{q}”.</div> : null}
            </Box>
          </Box>

          {/* Open thread */}
          <Box sx={{ minWidth: 0, minHeight: 0, [PHONE]: { display: UI.convOpen ? 'block' : 'none' } }}>
            {UI.conv ? <ThreadPanel key={UI.conv} pid={UI.conv} embedded /> : null}
          </Box>
        </Box>
      ) : <Empty panel>No properties yet.</Empty>}
    </Stack>
  )
}
