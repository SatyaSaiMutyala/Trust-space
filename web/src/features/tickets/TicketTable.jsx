/*
 * Ticket list with open/total count and the New ticket / Report an issue button (prototype ticketTable).
 * Two modes: `list` = a local array (property Repairs tab, with `pid`), or `server` = a useServerList() result (rows as
 * the API sorted and paged them; counts are the API totals for the current search and filters).
 */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { isOwner, prop, useStore } from '../../store/store'
import { openTicket, newTicket } from '../../store/actions'
import { slaBreached, slaDue } from '../../domain/lease'
import { fmtDT } from '../../domain/utils'
import { Btn, TableCard, ClickRow, Empty } from '../../components/ui/Layout'
import { StatusChip, PriChip } from '../../components/ui/Status'
import { TableSkeleton, Refreshing } from '../../components/ui/Skeletons'
import { DONE } from './actions'
import { useOpenCount } from './useOpenCount'

export default function TicketTable({ list, pid, server }) {
  useStore()
  const openCount = useOpenCount(server)
  const rows = server ? server.rows : [...list].sort((a, b) => (DONE.includes(a.status) - DONE.includes(b.status)) || a.priority.localeCompare(b.priority) || b.createdAt.localeCompare(a.createdAt))
  return (
    <>
      <div className="filters" style={{ justifyContent: 'space-between' }}>
        <span className="small muted">{server ? openCount : list.filter(t => !DONE.includes(t.status)).length} open · {server ? server.pagination?.total ?? 0 : list.length} total</span>
        <Btn primary sm onClick={() => newTicket(pid || undefined)}>{isOwner() ? 'Report an issue' : 'New ticket'}</Btn>
      </div>
      {!rows.length && server?.isFetching ? <TableSkeleton rows={6} cols={pid ? 7 : 8} /> : rows.length ? (
        <Refreshing on={!!server?.isFetching}><TableCard>
          <TableHead><TableRow><TableCell>Ticket</TableCell><TableCell>Issue</TableCell>{pid ? null : <TableCell>Property</TableCell>}<TableCell>Priority</TableCell><TableCell>Responsibility</TableCell><TableCell>Status</TableCell><TableCell>SLA</TableCell><TableCell>Photos</TableCell></TableRow></TableHead>
          <TableBody>
            {rows.map(t => {
              const br = slaBreached(t); const due = slaDue(t)
              return (
                <ClickRow key={t.id} onClick={() => openTicket(t.id)}>
                  <TableCell className="mono" sx={{ fontFamily: "var(--f-mono)", whiteSpace: "nowrap" }}>{t.no}<div className="small muted">{fmtDT(t.createdAt)}</div></TableCell>
                  <TableCell sx={{ minWidth: 200 }}><b>{t.title}</b><div className="small muted">{t.category} · {t.assignee || 'Unassigned'}</div></TableCell>
                  {pid ? null : <TableCell>{prop(t.propertyId)?.name || ''}</TableCell>}
                  <TableCell><PriChip p={t.priority} /></TableCell>
                  <TableCell>{t.responsibility}</TableCell>
                  <TableCell><StatusChip label={t.status} /></TableCell>
                  <TableCell className="small">{DONE.includes(t.status) ? '—' : br ? <span style={{ color: 'var(--bad)' }}>Breached</span> : 'by ' + fmtDT(due)}</TableCell>
                  <TableCell className="small">{(t.photos || []).length + (t.log || []).reduce((s, l) => s + (l.photos || []).length, 0)}</TableCell>
                </ClickRow>
              )
            })}
          </TableBody>
        </TableCard></Refreshing>
      ) : <Empty panel>{server ? server.message || 'No tickets found.' : 'No tickets.'}</Empty>}
    </>
  )
}
