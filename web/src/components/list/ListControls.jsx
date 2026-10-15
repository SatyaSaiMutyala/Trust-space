/*
 * Reusable list controls wired to useServerList():
 *   <ListToolbar list={L} searchPlaceholder="…" dateLabel="Invoice date"> <ListFilter list={L} name="status" … /> </ListToolbar>
 *   …rows…
 *   <Pager list={L} />
 */
import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Pagination from '@mui/material/Pagination'
import LinearProgress from '@mui/material/LinearProgress'

const ctlSx = { '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)' } }

/** Search box: types freely, sends the search 350 ms after the user stops typing. */
export function SearchBox({ value, onChange, placeholder = 'Search', sx }) {
  const [v, setV] = useState(value)
  const [prev, setPrev] = useState(value)
  if (value !== prev) { setPrev(value); setV(value) } // follow outside changes (e.g. Clear)
  useEffect(() => {
    if (v === value) return undefined
    const t = setTimeout(() => onChange(v), 350)
    return () => clearTimeout(t)
  }, [v]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <TextField type="search" size="small" value={v} onChange={e => setV(e.target.value)} placeholder={placeholder}
      sx={[{ flex: '1 1 260px', minWidth: 200, ...ctlSx }, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={{ htmlInput: { 'aria-label': placeholder }, input: { startAdornment: <InputAdornment position="start"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></InputAdornment> } }} />
  )
}

/** A filter select bound to list.params.filters[name]. options: value | [value, label]; first option = “all”. */
export function ListFilter({ list, name, label, options, allLabel = 'All', width = 170 }) {
  const opts = options.map(o => Array.isArray(o) ? o : [o, o])
  return (
    <TextField select size="small" label={label} value={list.params.filters[name] ?? ''} onChange={e => list.setFilter(name, e.target.value)}
      sx={{ width, flex: `0 1 ${width}px`, minWidth: 130, ...ctlSx, '@media (max-width:600px)': { flex: '1 1 140px', width: 'auto' } }}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>
      <option value="">{allLabel}</option>
      {opts.map(([v, l]) => <option key={String(v)} value={v}>{l}</option>)}
    </TextField>
  )
}

/** From / to dates for the resource's date field (?from=&to=). */
export function DateRange({ list, label = 'Date' }) {
  const p = list.params
  const field = (k, l) => (
    <TextField type="date" size="small" label={`${label} ${l}`} value={p[k]} onChange={e => list.set({ [k]: e.target.value })}
      sx={{ width: 165, flex: '0 1 165px', ...ctlSx, '@media (max-width:600px)': { flex: '1 1 140px', width: 'auto' } }}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: k === 'from' && p.to ? p.to : undefined, min: k === 'to' && p.from ? p.from : undefined } }} />
  )
  return <>{field('from', 'from')}{field('to', 'to')}</>
}

/**
 * Search + filters + date range + the API's summary message + Clear. children = <ListFilter>s or other controls.
 * dateLabel: show the date range for resources that have a date field.
 */
export function ListToolbar({ list, searchPlaceholder, dateLabel, children, actions }) {
  return (
    <Box sx={{ display: 'grid', gap: 1 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <SearchBox value={list.params.search} onChange={v => list.set({ search: v })} placeholder={searchPlaceholder} />
        {children}
        {dateLabel ? <DateRange list={list} label={dateLabel} /> : null}
        {list.filtered ? (
          <Box component="button" type="button" onClick={list.reset} sx={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--accent)', px: 1, py: .75, borderRadius: '6px', '&:hover': { bgcolor: 'var(--sunk)' } }}>Clear</Box>
        ) : null}
        {actions ? <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>{actions}</Box> : null}
      </Box>
      <Box sx={{ minHeight: 20, display: 'flex', alignItems: 'center', gap: 1 }}>
        <span className="small muted" aria-live="polite">{list.message}</span>
      </Box>
      <Box sx={{ height: 2, mt: -1 }}>{list.isFetching ? <LinearProgress sx={{ height: 2, borderRadius: 1, bgcolor: 'transparent', '& .MuiLinearProgress-bar': { bgcolor: 'var(--accent)' } }} /> : null}</Box>
    </Box>
  )
}

/** Page numbers + rows per page + “x–y of N”, from the API's pagination block. */
export function Pager({ list, sizes = [10, 25, 50, 100] }) {
  const pg = list.pagination
  if (!pg || !pg.total) return null
  const from = (pg.page - 1) * pg.limit + 1
  const to = Math.min(pg.total, pg.page * pg.limit)
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, py: .5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, color: 'var(--muted)' }}>
        <span>Rows per page</span>
        <TextField select size="small" value={pg.limit} onChange={e => list.set({ limit: Number(e.target.value) })} sx={{ width: 80, ...ctlSx }} slotProps={{ select: { native: true }, htmlInput: { 'aria-label': 'Rows per page' } }}>
          {sizes.map(n => <option key={n} value={n}>{n}</option>)}
        </TextField>
        <span>{from}–{to} of {pg.total}</span>
      </Box>
      {pg.totalPages > 1 ? (
        <Pagination page={Math.min(pg.page, pg.totalPages)} count={pg.totalPages} onChange={(e, page) => list.set({ page })} shape="rounded" size="small" siblingCount={1}
          sx={{ '& .Mui-selected': { bgcolor: 'var(--accent) !important', color: 'var(--accent-ink)' }, '@media (pointer:coarse)': { '& .MuiPaginationItem-root': { minWidth: 36, height: 36 } } }} />
      ) : null}
    </Box>
  )
}
