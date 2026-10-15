/*
 * Operations-console shell: fixed left rail of modules on desktop, a top bar with scrolling nav on tablets,
 * and a bottom tab bar + "More" sheet on phones (≤760px). Ported from renderNav / openSheet.
 */
import Box from '@mui/material/Box'
import Drawer from '@mui/material/Drawer'
import useMediaQuery from '@mui/material/useMediaQuery'
import { UI, APP, emit, role, isOwner, frFull, go, toast, useStore } from '../../store/store'
import { navItems, navCounts, normalizeRoute } from '../../store/nav'
import { Badge } from '../ui/Status'
import { signOut } from '../../services/auth'

const ROLE_LABEL = { admin: 'Administrator', staff: 'TrustLab staff', owner: 'Property owner', franchisee: 'Franchise partner' }
const initialsOf = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')

/** Signed-in user with Sign out. compact = avatar + sign-out only (tablet top bar). */
function UserCard({ compact }) {
  const u = APP.user; if (!u) return null
  const out = async () => { APP.sheet = false; const r = await signOut(); if (r?.message) toast(r.message, 'success') }
  const avatar = <Box aria-hidden="true" sx={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', bgcolor: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', font: '600 13px var(--f-body)' }}>{initialsOf(u.name)}</Box>
  const btn = <Box component="button" type="button" onClick={out} title="Sign out" sx={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--muted)', px: 1, py: .5, borderRadius: '6px', '&:hover': { color: 'var(--bad)', bgcolor: 'var(--sunk)' }, '&:focus-visible': { outline: '2px solid var(--accent)' }, '@media (pointer:coarse)': { py: 1.25 } }}>Sign out</Box>
  if (compact) return <Box sx={{ display: 'flex', alignItems: 'center', gap: .75 }} title={u.name + ' · ' + ROLE_LABEL[u.role]}>{avatar}{btn}</Box>
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, minWidth: 0 }}>
      {avatar}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ fontWeight: 600, fontSize: 13.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</Box>
        <Box sx={{ fontSize: 11.5, color: 'var(--muted)' }}>{ROLE_LABEL[u.role]}</Box>
      </Box>
      {btn}
    </Box>
  )
}

const isCurrent = k => UI.route === k || (UI.route === 'property' && k === (isOwner() ? 'o-home' : 'properties'))

function NavList({ grid }) {
  const counts = navCounts()
  return (
    <Box component="nav" aria-label="Modules" sx={grid ? { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 } : { display: 'flex', flexDirection: 'column', gap: '2px', '@media (max-width:900px)': { flexDirection: 'row', overflowX: 'auto', width: '100%', order: 3 } }}>
      {navItems().map(([k, l]) => {
        const c = counts[k]; const cur = isCurrent(k)
        return (
          <Box component="button" key={k} onClick={() => go(k)} aria-current={cur ? 'page' : undefined}
            sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.25, py: 1, borderRadius: '6px', color: cur ? 'var(--ink)' : 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap', bgcolor: cur ? 'color-mix(in srgb,var(--accent) 13%,transparent)' : 'transparent', '&:hover': { bgcolor: cur ? undefined : 'var(--sunk)', color: 'var(--ink)' }, '&:focus-visible': { outline: '2px solid var(--accent)' }, ...(grid ? { minHeight: 48, border: '1px solid var(--line)', boxSizing: 'border-box' } : {}) }}>
            <span>{l}</span>{c ? <Badge n={c} hot={k === 'messages'} /> : null}
          </Box>
        )
      })}
    </Box>
  )
}

function Brand() {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, px: 0.75 }}>
      <Box aria-hidden="true" sx={{ width: 34, height: 34, borderRadius: '8px', bgcolor: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)', font: '700 18px var(--f-display)', position: 'relative', '&::after': { content: '""', position: 'absolute', right: -3, bottom: -3, width: 11, height: 11, borderRadius: '3px', bgcolor: 'var(--sun)' }, '@media (max-width:760px)': { width: 30, height: 30, fontSize: 16 } }}>T</Box>
      <div>
        <Box component="b" sx={{ font: '700 17px var(--f-display)', display: 'block', lineHeight: 1, '@media (max-width:760px)': { fontSize: 16 } }}>TruSpace</Box>
        <Box component="span" sx={{ fontSize: 11, color: 'var(--muted)' }}>TrustLab Facilities &amp; Leases</Box>
      </div>
    </Box>
  )
}

const ICON = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  check: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v3h6V3M8.5 13l2.5 2.5 4.5-5" /></>,
  tool: <path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8V21h3.2l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z" />,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  more: <path d="M4 7h16M4 12h16M4 17h16" />,
}
function TabBar() {
  const r = role(); const counts = navCounts()
  const TABS = r.kind === 'franchisee'
    ? (frFull(r) ? [['overview', 'Home', 'home'], ['inspections', 'Inspect', 'check'], ['tickets', 'Repairs', 'tool'], ['messages', 'Messages', 'chat']] : [['sites', 'Locations', 'home']])
    : r.kind === 'owner' ? [['o-home', 'Home', 'home'], ['inspections', 'Inspect', 'check'], ['tickets', 'Repairs', 'tool'], ['messages', 'Messages', 'chat']]
      : [['overview', 'Home', 'home'], ['inspections', 'Inspect', 'check'], ['tickets', 'Repairs', 'tool'], ['messages', 'Messages', 'chat']]
  const cur = UI.route === 'property' ? (r.kind === 'owner' ? 'o-home' : '') : UI.route
  const inMore = !TABS.some(t => t[0] === cur)
  const tab = (key, label, ic, onClick, current, count) => (
    <Box component="button" key={key} onClick={onClick} aria-current={current ? 'page' : undefined}
      sx={{ all: 'unset', cursor: 'pointer', display: 'grid', justifyItems: 'center', gap: '2px', pt: 1, pb: 0.75, fontSize: 11, fontWeight: 500, color: current ? 'var(--accent)' : 'var(--muted)', position: 'relative', minHeight: 52, boxSizing: 'border-box', '& svg': { width: 24, height: 24, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinejoin: 'round', strokeLinecap: 'round' }, '&:focus-visible': { outline: '2px solid var(--accent)', outlineOffset: '-2px' } }}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[ic]}</svg><span>{label}</span>
      {count ? <Box component="i" sx={{ position: 'absolute', top: 4, left: 'calc(50% + 6px)', font: '600 10px var(--f-mono)', fontStyle: 'normal', bgcolor: 'var(--bad)', color: '#fff', borderRadius: '9px', px: '5px', py: '1px' }}>{count}</Box> : null}
    </Box>
  )
  return (
    <Box component="nav" aria-label="Main" sx={{ display: 'grid', gridTemplateColumns: `repeat(${TABS.length + 1},1fr)`, position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1100, bgcolor: 'var(--surface)', borderTop: '1px solid var(--line)', pb: 'env(safe-area-inset-bottom,0px)', pl: 'env(safe-area-inset-left,0px)', pr: 'env(safe-area-inset-right,0px)' }}>
      {TABS.map(([k, l, ic]) => tab(k, l, ic, () => go(k), cur === k, counts[k]))}
      {tab('more', 'More', 'more', () => { APP.sheet = true; emit() }, inMore)}
    </Box>
  )
}

function MoreSheet() {
  return (
    <Drawer anchor="bottom" open={APP.sheet} onClose={() => { APP.sheet = false; emit() }}
      slotProps={{ paper: { sx: { borderRadius: '16px 16px 0 0', maxHeight: '85vh', bgcolor: 'var(--surface)', pt: 1, pb: 'calc(16px + env(safe-area-inset-bottom,0px))', px: 2, display: 'grid', gap: 1.25 } } }}>
      <Box sx={{ width: 40, height: 4, borderRadius: 2, bgcolor: 'var(--line)', mx: 'auto', mt: 0.5, mb: 0.75 }} />
      <NavList grid />
      <Box sx={{ borderTop: '1px solid var(--line)', pt: 1.25 }}><UserCard /></Box>
      <p className="small muted" style={{ margin: '6px 4px 0' }}>Use TruSpace like an app: open the menu in your phone’s browser and choose “Add to Home Screen”.</p>
    </Drawer>
  )
}

export default function AppShell({ children }) {
  useStore()
  const phone = useMediaQuery('(max-width:760px)')
  const r = role()
  normalizeRoute()
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '232px minmax(0,1fr)', minHeight: '100%', '@media (max-width:900px)': { gridTemplateColumns: 'minmax(0,1fr)', gridTemplateRows: 'auto 1fr', alignContent: 'start' } }}>
      <Box component="aside" aria-label="Modules"
        sx={{ bgcolor: 'var(--surface)', borderRight: '1px solid var(--line)', py: 2.25, pl: 'max(14px, env(safe-area-inset-left,0px))', pr: 1.75, position: 'sticky', top: 0, height: '100vh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2.25,
          '@media (max-width:900px)': { top: 'env(safe-area-inset-top,0px)', height: 'auto', zIndex: 1000, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', py: 1.25, px: 2, borderRight: 0, borderBottom: '1px solid var(--line)', gap: 1.25 },
          '@media (max-width:760px)': { top: 0, pt: 'calc(8px + env(safe-area-inset-top,0px))', pb: 1, flexWrap: 'nowrap' } }}>
        <Brand />
        {r.kind !== 'none' && !phone ? <NavList /> : null}
        {r.kind !== 'none' && !phone ? (
          <Box sx={{ mt: 'auto', borderTop: '1px solid var(--line)', pt: 1.75, '@media (max-width:900px)': { m: '0 0 0 auto', border: 0, p: 0, '& .eyebrow': { display: 'none' }, display: 'flex', alignItems: 'center', gap: 1.5 } }}>
            <Box sx={{ '@media (max-width:900px)': { display: 'none' } }}><UserCard /></Box>
            <Box sx={{ display: 'none', '@media (max-width:900px)': { display: 'block' } }}><UserCard compact /></Box>
          </Box>
        ) : null}
      </Box>
      <Box component="main" sx={{ minWidth: 0, pt: 2.75, pb: 7.5, pl: 'max(16px, env(safe-area-inset-left,0px))', pr: 'max(16px, env(safe-area-inset-right,0px))', '@media (max-width:760px)': { pt: 1.75, pb: 'calc(88px + env(safe-area-inset-bottom,0px))' } }}>
        <Box sx={{ maxWidth: 1280, mx: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 2.5, '&>*': { minWidth: 0 } }}>{children}</Box>
      </Box>
      {phone && r.kind !== 'none' ? <><TabBar /><MoreSheet /></> : null}
    </Box>
  )
}
