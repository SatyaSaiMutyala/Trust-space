/*
 * One property's conversation (prototype thread): header, messages grouped by day and sender, composer.
 * embedded = inside the Messages chat window (fills its height); otherwise a standalone panel (property Messages tab).
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import InputBase from '@mui/material/InputBase'
import { S, isOwner, prop, owner, side, openProp, useStore } from '../../store/store'
import { by } from '../../domain/utils'
import { Btn } from '../../components/ui/Layout'
import { Avatar, Bubble, DateDivider, SendIcon, ClipIcon, ChatIcon } from './chatParts'
import { dayOf } from './chatUtils'
import { sendMessage, markRead, convBack } from './actions'

const HINT = 'Photos, videos and PDFs can be attached'
const KINDS = ['Message', 'Notice', 'Approval request']

export default function ThreadPanel({ pid, embedded }) {
  useStore()
  const P = prop(pid); const s = side(); const other = s === 'tdpl' ? 'owner' : 'tdpl'
  const O = owner(P?.ownerId)
  const msgs = S.messages.filter(m => m.propertyId === pid).sort(by('at'))
  const unreadKey = msgs.filter(m => m.from !== s && !(m.read || {})[s]).map(m => m.id).join(',')
  const [text, setText] = useState('')
  const [kind, setKind] = useState('Message')
  const [files, setFiles] = useState(0)
  const [busy, setBusy] = useState(false)
  const threadRef = useRef(null)
  const formRef = useRef(null)

  useEffect(() => {
    if (!unreadKey) return
    const t = setTimeout(() => markRead(unreadKey.split(',')), 400)
    return () => clearTimeout(t)
  }, [unreadKey])
  useLayoutEffect(() => { const th = threadRef.current; if (th) th.scrollTop = th.scrollHeight }, [pid, msgs.length])

  const onSubmit = async e => {
    e.preventDefault(); if (busy) return
    const f = e.currentTarget; const fd = new FormData(f)
    if (!(fd.get('text') || '').trim()) return
    setBusy(true)
    try {
      f.reset(); setText(''); setFiles(0); setKind('Message')
      await sendMessage(pid, fd)
    } finally { setBusy(false) }
  }
  const onKey = e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); formRef.current?.requestSubmit() } }

  const title = P?.name || ''
  const withWhom = isOwner() ? 'TrustLab Facilities' : (O?.name || 'Owner')

  /* Messages with day separators and sender runs */
  const items = []
  msgs.forEach((m, i) => {
    const prev = msgs[i - 1], next = msgs[i + 1]
    const day = dayOf(m.at)
    if (!prev || dayOf(prev.at) !== day) items.push(<DateDivider key={'d' + day} day={day} />)
    const sameAsPrev = prev && prev.from === m.from && prev.by === m.by && dayOf(prev.at) === day
    const sameAsNext = next && next.from === m.from && next.by === m.by && dayOf(next.at) === day
    items.push(<Bubble key={m.id} m={m} mine={m.from === s} first={!sameAsPrev} last={!sameAsNext} seen={!!(m.read || {})[other]} />)
  })

  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, bgcolor: 'var(--surface)',
      ...(embedded ? { height: '100%' } : { height: { xs: 'calc(100dvh - 260px)', md: 620 }, minHeight: 420, border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }),
    }}>
      {/* Header */}
      <Box component="header" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: { xs: 1.25, sm: 2.25 }, py: 1.5, borderBottom: '1px solid var(--line)', bgcolor: 'var(--surface)' }}>
        {embedded ? (
          <Btn ghost type="button" onClick={convBack} aria-label="All conversations"
            sx={{ display: 'none', minWidth: 40, minHeight: 40, px: 1, fontSize: 20, '@media (max-width:760px)': { display: 'inline-flex' } }}>←</Btn>
        ) : null}
        <Avatar name={title} size={44} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Box component="h2" sx={{ fontSize: { xs: '1rem', sm: '1.15rem' }, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</Box>
          <Box className="small muted" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            Conversation with {withWhom}{P?.code ? <> · <span className="mono">{P.code}</span></> : null}
          </Box>
        </Box>
        {embedded ? <Btn sm onClick={() => openProp(pid)} sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>Open property</Btn> : null}
      </Box>

      {/* Messages */}
      <Box ref={threadRef} id="thread" sx={{
        flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 1.25, sm: 3 }, py: 2,
        bgcolor: 'var(--bg)',
        backgroundImage: 'radial-gradient(color-mix(in srgb,var(--accent) 7%,transparent) 1px, transparent 1px)', backgroundSize: '18px 18px',
      }}>
        {msgs.length ? items : (
          <Box sx={{ height: '100%', display: 'grid', placeItems: 'center', textAlign: 'center', color: 'var(--muted)' }}>
            <div>
              <Box sx={{ color: 'var(--accent)', opacity: .6, mb: 1 }}><ChatIcon /></Box>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>No messages yet</div>
              <div className="small">Start the conversation with {withWhom} below.</div>
            </div>
          </Box>
        )}
      </Box>

      {/* Composer */}
      <Box component="form" ref={formRef} onSubmit={onSubmit} sx={{ borderTop: '1px solid var(--line)', bgcolor: 'var(--surface)', px: { xs: 1, sm: 2 }, pt: 1.25, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, border: '1px solid var(--line)', borderRadius: '24px', bgcolor: 'var(--bg)', pl: 0.75, pr: 0.75, py: 0.75, transition: 'border-color .15s, box-shadow .15s', '&:focus-within': { borderColor: 'var(--accent)', boxShadow: '0 0 0 3px color-mix(in srgb,var(--accent) 15%,transparent)' } }}>
          <Box component="label" title="Attach photo, video or PDF" sx={{ width: 40, height: 40, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', color: files ? 'var(--accent)' : 'var(--muted)', '&:hover': { bgcolor: 'var(--sunk)', color: 'var(--accent)' } }}>
            <ClipIcon />
            <input type="file" name="files" id="msgFiles" multiple accept="image/*,video/*,application/pdf" aria-label="Attach photos, videos or PDF" hidden onChange={e => setFiles(e.target.files.length)} />
          </Box>
          <InputBase name="text" id="msgText" placeholder={`Message ${withWhom}…`} required multiline maxRows={6}
            value={text} onChange={e => setText(e.target.value)} onKeyDown={onKey}
            inputProps={{ 'aria-label': 'Message' }} sx={{ flex: 1, py: 1, fontSize: 14.5, '@media (max-width:760px)': { fontSize: 16 } }} />
          <Box component="button" type="submit" aria-label="Send" disabled={busy || !text.trim()}
            sx={{ width: 40, height: 40, flex: 'none', border: 0, borderRadius: '50%', display: 'grid', placeItems: 'center', cursor: 'pointer', bgcolor: 'var(--accent)', color: 'var(--accent-ink)', transition: 'transform .1s, opacity .15s', '&:hover:not(:disabled)': { filter: 'brightness(1.08)' }, '&:active:not(:disabled)': { transform: 'scale(.94)' }, '&:disabled': { opacity: .45, cursor: 'default' } }}>
            <SendIcon />
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.75, px: 0.5 }}>
          <Box role="radiogroup" aria-label="Message type" sx={{ display: 'flex', gap: 0.5 }}>
            {KINDS.map(k => (
              <Box component="label" key={k} sx={{ cursor: 'pointer', fontSize: 12, fontWeight: 500, px: 1.25, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: kind === k ? (k === 'Message' ? 'var(--accent)' : 'var(--warn)') : 'var(--line)', color: kind === k ? (k === 'Message' ? 'var(--accent)' : 'var(--warn)') : 'var(--muted)', bgcolor: kind === k ? (k === 'Message' ? 'color-mix(in srgb,var(--accent) 9%,transparent)' : 'color-mix(in srgb,var(--warn) 10%,transparent)') : 'transparent', '@media (pointer:coarse)': { py: 0.9 } }}>
                <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }} />{k}
              </Box>
            ))}
          </Box>
          <Box component="span" id="attHint" className="small muted" sx={{ ml: 'auto' }}>
            {files ? <b style={{ color: 'var(--accent)' }}>{files} file{files > 1 ? 's' : ''} attached</b> : <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{HINT} · Enter to send, Shift+Enter for a new line</Box>}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
