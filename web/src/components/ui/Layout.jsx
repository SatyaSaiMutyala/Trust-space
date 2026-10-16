/* Layout building blocks shared by every screen. */
import { useLayoutEffect, useRef } from 'react'
import Paper from '@mui/material/Paper'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import TableContainer from '@mui/material/TableContainer'
import Table from '@mui/material/Table'
import TableRow from '@mui/material/TableRow'

/** App button. primary = filled accent, danger = red outline, ghost = no border, sm = compact. */
export function Btn({ primary, danger, ghost, sm, sx, children, ...rest }) {
  return (
    <Button
      variant={primary ? 'contained' : ghost ? 'text' : 'outlined'}
      size={sm ? 'small' : 'medium'}
      sx={[danger && { color: 'var(--bad)', borderColor: 'color-mix(in srgb,var(--bad) 45%,var(--line))' }, ghost && { borderColor: 'transparent' }, ...(Array.isArray(sx) ? sx : [sx])]}
      {...rest}
    >{children}</Button>
  )
}

/** Inline text link that runs an action instead of navigating. */
export function ActLink({ onClick, children, ...rest }) {
  return <a href="#" onClick={e => { e.preventDefault(); e.stopPropagation(); onClick?.(e) }} {...rest}>{children}</a>
}

/** Page title row: h1, optional subtitle and action buttons. */
/** subWide: the subtitle is a row of status chips rather than prose, so it may use the full width. */
export function PageHead({ title, sub, actions, subWide }) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1.5, '@media (max-width:760px)': { '& .actions': { width: '100%' }, '& .actions .MuiButton-root': { flex: '1 1 auto', whiteSpace: 'normal', textAlign: 'center' } } }}>
      <div style={subWide ? { flex: '1 1 auto', minWidth: 0 } : undefined}>
        <h1>{title}</h1>
        {sub ? <Box component="p" sx={{ m: '4px 0 0', color: 'var(--muted)', maxWidth: subWide ? 'none' : '68ch' }}>{sub}</Box> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </Box>
  )
}

/** Bordered surface with an optional header (title, subtitle, right-side actions). */
export function Panel({ title, sub, actions, children, body = true, id, className, sx, headerless }) {
  return (
    <Paper variant="outlined" id={id} className={className} sx={[{ borderColor: 'var(--line)', borderRadius: 'var(--r)', bgcolor: 'var(--surface)', minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      {!headerless && (title || actions) ? (
        <Box component="header" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 2, py: 1.5, borderBottom: '1px solid var(--line)', '@media (max-width:760px)': { px: 1.5, py: 1.25 } }}>
          <div>{typeof title === 'string' ? <h2>{title}</h2> : title}{sub ? <div className="small muted">{sub}</div> : null}</div>
          {actions}
        </Box>
      ) : null}
      {body ? <Box sx={{ px: 2, py: 1.75, '@media (max-width:760px)': { p: 1.5 } }}>{children}</Box> : children}
    </Paper>
  )
}

/** Dashed warning strip. tone="bad" for a red border. */
export function Banner({ children, tone, sx, ...rest }) {
  return <Box className="banner" sx={[tone === 'bad' && { borderColor: 'var(--bad)' }, ...(Array.isArray(sx) ? sx : [sx])]} {...rest}>{children}</Box>
}

/** Centred empty-state message, optionally inside a panel. */
/** A titled sub-section inside a page or panel: bordered card with a tinted header strip and a coloured title. */
export function Section({ title, sub, actions, children, sx }) {
  return (
    <Box sx={[{ border: '1px solid var(--line)', borderRadius: 'var(--r)', bgcolor: 'var(--surface)', minWidth: 0, overflow: 'hidden' }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Box component="header" sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 1, px: 2, py: 1.25, borderBottom: '1px solid var(--line)', borderLeft: '4px solid var(--accent)', bgcolor: 'color-mix(in srgb, var(--accent) 9%, var(--surface))', '@media (max-width:760px)': { px: 1.5, py: 1 } }}>
        <div><div className="eyebrow" style={{ color: 'var(--accent)', fontSize: 12 }}>{title}</div>{sub ? <div className="small muted" style={{ marginTop: 2 }}>{sub}</div> : null}</div>
        {actions}
      </Box>
      <Box sx={{ p: 2, '@media (max-width:760px)': { p: 1.5 } }}>{children}</Box>
    </Box>
  )
}

export function Empty({ children, panel }) {
  return panel ? <Panel body={false}><div className="empty">{children}</div></Panel> : <div className="empty">{children}</div>
}

export function Kpis({ children }) { return <div className="kpis">{children}</div> }
export function Kpi({ label, value, sub, alert }) {
  return <div className={'kpi' + (alert ? ' alert' : '')}><span className="eyebrow">{label}</span><span className="v">{value}</span>{sub ? <span className="s">{sub}</span> : null}</div>
}

/** Label/value grid. items: [label, node][] */
export function Facts({ items }) {
  return <div className="facts">{items.filter(Boolean).map(([l, v], i) => <div className="fact" key={i}><div className="l">{l}</div><div className="v">{v ?? <span className="muted">—</span>}</div></div>)}</div>
}

/** Vertical stack with the standard 20px gap. */
export function Stack({ gap = 2.5, children, sx }) { return <Box sx={[{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap, '&>*': { minWidth: 0 } }, ...(Array.isArray(sx) ? sx : [sx])]}>{children}</Box> }
/** Two/three equal columns that collapse to one below 900px. */
export function Cols({ n = 2, children }) { return <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${n},minmax(0,1fr))`, gap: 2.5, '@media (max-width:900px)': { gridTemplateColumns: '1fr' } }}>{children}</Box> }

/** Copy each column header onto its body cells (data-label) so the table can render as stacked cards on phones. */
function labelCells(t) {
  if (!t) return
  const names = []
  t.querySelectorAll('thead tr:last-child th').forEach(h => { for (let i = 0; i < (h.colSpan || 1); i++) names.push(h.textContent.trim()) })
  t.querySelectorAll('tbody tr, tfoot tr').forEach(tr => {
    let i = 0
    for (const td of tr.children) { const l = td.colSpan > 1 ? '' : (names[i] || ''); if (td.getAttribute('data-label') !== l) td.setAttribute('data-label', l); i += td.colSpan || 1 }
  })
}

/**
 * Bordered table. Wide tables scroll horizontally; on phones (≤600px) rows become stacked cards with
 * "LABEL value" lines unless cards={false} (use that for grids/matrices that must keep their columns).
 */
export function TableCard({ children, panel = true, className, sx, maxHeight, cards = true }) {
  const ref = useRef(null)
  useLayoutEffect(() => { if (cards) labelCells(ref.current) })
  const t = <TableContainer sx={{ overflowX: 'auto', maxHeight }}><Table ref={ref} size="small" className={[className, cards ? 'tcards' : ''].filter(Boolean).join(' ')} stickyHeader={!!maxHeight}>{children}</Table></TableContainer>
  return panel ? <Paper variant="outlined" sx={[{ borderColor: 'var(--line)', bgcolor: 'var(--surface)', minWidth: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}>{t}</Paper> : t
}
/** Clickable table row. */
export function ClickRow({ onClick, children, className, ...rest }) {
  return <TableRow hover onClick={onClick} className={className} sx={{ cursor: 'pointer', '&:hover td': { bgcolor: 'color-mix(in srgb,var(--accent) 5%,transparent)' } }} {...rest}>{children}</TableRow>
}
