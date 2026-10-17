/* Trash — deleted records, one category at a time (folder on the left, its records on the right) with search, paging,
   Restore and Delete permanently (GET/POST/DELETE /api/trash). */
import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import SearchIcon from '@mui/icons-material/Search'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import { useStore, APP, toast } from '../../store/store'
import { callApi } from '../../app/store'
import { api } from '../../app/api'
import { useReport } from '../../app/useReport'
import { refreshPortfolio } from '../../app/bootstrap'
import { fmtDT } from '../../domain/utils'
import { PageHead, Panel, TableCard, Btn, Stack, Empty } from '../../components/ui/Layout'
import { ConfirmButton, Badge } from '../../components/ui/Status'
import { TableSkeleton } from '../../components/ui/Skeletons'
import { SelectInput } from '../../components/form/Fields'
import { Pager } from '../../components/list/ListControls'

const NW = { whiteSpace: 'nowrap' }
const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

/** Local paging with the same Pager control as the server lists. */
function useLocalPager(total) {
  const [p, setP] = useState({ page: 1, limit: 10 })
  const totalPages = Math.max(1, Math.ceil(total / p.limit)); const page = Math.min(p.page, totalPages)
  return { pagination: { page, limit: p.limit, total, totalPages }, set: patch => setP(x => ({ ...x, ...patch, page: patch.limit ? 1 : (patch.page ?? x.page) })), slice: rows => rows.slice((page - 1) * p.limit, page * p.limit), reset: () => setP(x => ({ ...x, page: 1 })) }
}

/** Category list — a folder tree on wide screens, a dropdown on phones. */
function Categories({ cats, value, onChange }) {
  return (
    <>
      <Box component="nav" aria-label="Trash categories" sx={{ display: 'grid', gap: '2px', alignContent: 'start', '@media (max-width:900px)': { display: 'none' } }}>
        {cats.map(c => {
          const cur = c.resource === value
          return (
            <Box component="button" key={c.resource} onClick={() => onChange(c.resource)} aria-current={cur ? 'page' : undefined}
              sx={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, px: 1.25, py: 1, borderRadius: '8px', fontWeight: 500, color: cur ? 'var(--ink)' : 'var(--muted)', bgcolor: cur ? 'color-mix(in srgb,var(--accent) 13%,transparent)' : 'transparent', '&:hover': { bgcolor: cur ? undefined : 'var(--sunk)', color: 'var(--ink)' }, '&:focus-visible': { outline: '2px solid var(--accent)' } }}>
              <span>{cap(c.plural)}</span><Badge n={c.items.length} />
            </Box>
          )
        })}
      </Box>
      <Box sx={{ display: 'none', '@media (max-width:900px)': { display: 'block' } }}>
        <SelectInput grid={false} id="trashCat" aria-label="Category" value={value} onChange={e => onChange(e.target.value)} options={cats.map(c => [c.resource, `${cap(c.plural)} (${c.items.length})`])} />
      </Box>
    </>
  )
}

export default function TrashPage() {
  useStore()
  const { data: T, isFetching } = useReport(api.useTrashQuery, undefined)
  const admin = APP.user?.role === 'admin'
  const [sel, setSel] = useState('')
  const [q, setQ] = useState('')
  const cats = T?.categories || []
  const cat = cats.find(c => c.resource === sel) || cats[0] || null
  const needle = q.trim().toLowerCase()
  const rows = cat ? cat.items.filter(it => !needle || `${it.label} ${it.sub} ${it.deletedBy}`.toLowerCase().includes(needle)) : []
  const pager = useLocalPager(rows.length)
  const act = async (endpoint, arg) => {
    try { const res = await callApi(endpoint, arg); toast(res.message, 'success'); await refreshPortfolio({ force: true }) } catch (e) { toast(e.message, 'error') }
  }
  const pick = r => { setSel(r); setQ(''); pager.reset() }
  return (
    <Stack>
      <PageHead title="Trash" sub="Records you deleted stay here, by category, until you restore them or delete them for good."
        actions={admin && T?.total ? <ConfirmButton label="Empty Trash" confirmLabel="Click again to delete everything permanently" onConfirm={() => act('trashEmpty')} /> : null} />
      {!T ? <TableSkeleton rows={6} cols={4} /> : !T.total ? <Empty panel>Trash is empty.</Empty> : (
        <Box sx={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr)', gap: 2.5, alignItems: 'start', '@media (max-width:900px)': { gridTemplateColumns: 'minmax(0,1fr)' } }}>
          <Categories cats={cats} value={cat.resource} onChange={pick} />
          <Panel body={false} title={<h3>{cap(cat.plural)} <span className="muted" style={{ fontWeight: 400 }}>· {rows.length}{needle ? ` of ${cat.items.length}` : ''}</span></h3>}
            actions={<TextField size="small" value={q} onChange={e => { setQ(e.target.value); pager.reset() }} placeholder={`Search ${cat.plural}`} sx={{ width: 240, maxWidth: '100%', '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)' } }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }, htmlInput: { 'aria-label': 'Search trash' } }} />}>
            <TableCard panel={false}>
              <TableHead><TableRow><TableCell>Record</TableCell><TableCell>Deleted</TableCell><TableCell>By</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {pager.slice(rows).map(it => (
                  <TableRow key={it.id}>
                    <TableCell><b>{it.label}</b>{it.sub ? <div className="small muted">{it.sub}</div> : null}</TableCell>
                    <TableCell className="small" sx={NW}>{fmtDT(it.deletedAt)}</TableCell>
                    <TableCell className="small">{it.deletedBy || '—'}</TableCell>
                    <TableCell>
                      {cat.canWrite ? (
                        <div className="actions" style={{ justifyContent: 'flex-end', opacity: isFetching ? 0.6 : 1 }}>
                          <Btn sm primary onClick={() => act('trashRestore', { resource: cat.resource, id: it.id })}>Restore</Btn>
                          <ConfirmButton sm confirmLabel="Click again to delete permanently" onConfirm={() => act('trashDestroy', { resource: cat.resource, id: it.id })} />
                        </div>
                      ) : <span className="small muted">Read-only</span>}
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length ? null : <TableRow><TableCell colSpan={4} className="empty">Nothing matches “{q}”.</TableCell></TableRow>}
              </TableBody>
            </TableCard>
            <div style={{ padding: '4px 16px' }}><Pager list={pager} /></div>
          </Panel>
        </Box>
      )}
    </Stack>
  )
}
