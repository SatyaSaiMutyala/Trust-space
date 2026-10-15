/*
 * Shimmer (skeleton) placeholders shown while data is being fetched.
 *   <TableSkeleton rows cols />   first load of a table list
 *   <CardsSkeleton count />       first load of a card grid
 *   <AppSkeleton />               the whole app while the portfolio loads after sign-in
 *   <Refreshing on>…</Refreshing> keeps current rows visible but faded while a new page/filter loads
 */
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'

const sk = { bgcolor: 'var(--sunk)', '&::after': { background: 'linear-gradient(90deg, transparent, color-mix(in srgb, var(--surface) 70%, transparent), transparent)' } }
/** One shimmer bar. */
export const Bar = ({ w = '100%', h = 14, r = 6, sx }) => <Skeleton variant="rounded" animation="wave" width={w} height={h} sx={[sk, { borderRadius: `${r}px` }, ...(Array.isArray(sx) ? sx : [sx])]} />

const WIDTHS = ['70%', '85%', '55%', '65%', '45%', '75%', '60%', '50%']

/** Placeholder table: header + rows, inside a bordered card like TableCard. */
export function TableSkeleton({ rows = 6, cols = 6, panel = true }) {
  const body = (
    <Box role="status" aria-label="Loading" sx={{ display: 'grid' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 2, px: 1.5, py: 1.4, borderBottom: '1px solid var(--line)' }}>
        {Array.from({ length: cols }, (_, c) => <Bar key={c} w="50%" h={10} />)}
      </Box>
      {Array.from({ length: rows }, (_, r) => (
        <Box key={r} sx={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 2, px: 1.5, py: 1.6, borderBottom: r < rows - 1 ? '1px solid var(--line)' : 0, alignItems: 'center',
          '@media (max-width:600px)': { gridTemplateColumns: '1fr', gap: 1 } }}>
          {Array.from({ length: cols }, (_, c) => (
            <Box key={c} sx={{ display: 'grid', gap: .75, '@media (max-width:600px)': { display: c > 2 ? 'none' : 'grid' } }}>
              <Bar w={WIDTHS[(r + c) % WIDTHS.length]} />
              {c === 0 ? <Bar w="40%" h={10} /> : null}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  )
  return panel ? <Box sx={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', bgcolor: 'var(--surface)', overflow: 'hidden' }}>{body}</Box> : body
}

/** Placeholder card grid (property cards, site cards). */
export function CardsSkeleton({ count = 6, image = true }) {
  return (
    <Box role="status" aria-label="Loading" className="cards">
      {Array.from({ length: count }, (_, i) => (
        <Box key={i} sx={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', bgcolor: 'var(--surface)', overflow: 'hidden' }}>
          {image ? <Skeleton variant="rectangular" animation="wave" sx={[sk, { width: '100%', height: 'auto', aspectRatio: '16/7' }]} /> : null}
          <Box sx={{ p: 1.75, display: 'grid', gap: 1 }}>
            <Bar w="35%" h={10} /><Bar w={WIDTHS[i % WIDTHS.length]} h={18} /><Bar w="80%" h={12} />
            <Box sx={{ borderTop: '1px solid var(--line)', pt: 1.25, display: 'grid', gap: 1 }}><Bar w="55%" /><Bar w="45%" /><Bar w="60%" /></Box>
          </Box>
        </Box>
      ))}
    </Box>
  )
}

/** Placeholder KPI strip. */
export function KpiSkeleton({ count = 5 }) {
  return (
    <Box className="kpis" role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => <Box key={i} className="kpi"><Bar w="55%" h={10} /><Bar w="70%" h={26} sx={{ my: .5 }} /><Bar w="85%" h={10} /></Box>)}
    </Box>
  )
}

/** Keeps the current content visible but faded and non-interactive while new data loads. */
export function Refreshing({ on, children }) {
  return <Box sx={{ transition: 'opacity .15s', ...(on ? { opacity: .55, pointerEvents: 'none' } : {}) }} aria-busy={on || undefined}>{children}</Box>
}

/** The whole app while the portfolio loads after sign-in: menu, page title, KPIs and a table. */
export function AppSkeleton() {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '232px minmax(0,1fr)', minHeight: '100dvh', bgcolor: 'var(--bg)', '@media (max-width:900px)': { gridTemplateColumns: '1fr' } }}>
      <Box sx={{ bgcolor: 'var(--surface)', borderRight: '1px solid var(--line)', p: 2, display: 'grid', alignContent: 'start', gap: 1.75, '@media (max-width:900px)': { display: 'none' } }}>
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', mb: 1 }}><Bar w={34} h={34} r={8} /><Box sx={{ flex: 1, display: 'grid', gap: .75 }}><Bar w="60%" /><Bar w="85%" h={10} /></Box></Box>
        {Array.from({ length: 10 }, (_, i) => <Bar key={i} w={WIDTHS[i % WIDTHS.length]} h={16} />)}
      </Box>
      <Box sx={{ p: { xs: 2, md: 3 }, display: 'grid', alignContent: 'start', gap: 2.5, maxWidth: 1280, width: '100%', mx: 'auto' }}>
        <Box sx={{ display: 'grid', gap: 1 }}><Bar w={280} h={30} /><Bar w="min(520px, 90%)" h={14} /></Box>
        <KpiSkeleton />
        <TableSkeleton rows={6} cols={7} />
      </Box>
    </Box>
  )
}
