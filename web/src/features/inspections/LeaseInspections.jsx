/* The two joint inspections of a lease as fixed rows — Take-over and Handover — each with one clear state:
   Not started (no date yet) · In progress (date entered) · Awaiting owner sign-off / Disputed · Completed (signed) · Skipped.
   Props: { L }. Used on the property's Inspections tab. */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore, isOwner, openDrawer } from '../../store/store'
import { inspOf, inspOpen, inspSummary, skipKey } from '../../domain/inspection'
import { IN_KIND } from '../../domain/constants'
import { fmtD, inr } from '../../domain/utils'
import { Btn, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { newInsp, openInsp } from '../../store/actions'

const LABEL = { 'Not started': 'Not started', 'In progress': 'In progress', 'Awaiting owner sign-off': 'Awaiting owner sign-off', Disputed: 'Disputed', Signed: 'Completed', Skipped: 'Skipped' }
const K = { 'Not started': 'idle', 'In progress': 'info', 'Awaiting owner sign-off': 'warn', Disputed: 'bad', Signed: 'ok', Skipped: 'idle' }

/** State of one inspection kind on a lease: { st, I, sk, can } — can = this kind may be started now. */
function inspState(L, kind) {
  const I = inspOf(L.id, kind); const sk = L[skipKey(kind)]
  const can = kind === 'Move-in' || !!(L.exit && L.exit.noticeDate)
  if (sk && (!I || inspOpen(I))) return { st: 'Skipped', I, sk, can }
  return { st: I ? I.status : 'Not started', I, sk: null, can }
}

export default function LeaseInspections({ L }) {
  useStore()
  const o = isOwner()
  const skip = kind => openDrawer({ kind: 'skipInsp', id: L.id, insp: kind })
  return (
    <TableCard>
      <TableHead><TableRow>
        <TableCell>Inspection</TableCell><TableCell>Date</TableCell><TableCell>Issues</TableCell><TableCell className="num">Deductions</TableCell><TableCell>Signed</TableCell><TableCell>Status</TableCell><TableCell>Actions</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {['Move-in', 'Move-out'].map(kind => {
          const { st, I, sk, can } = inspState(L, kind); const sum = I ? inspSummary(I) : null; const name = IN_KIND[kind].toLowerCase()
          const acts = []
          if (st === 'Skipped') { acts.push(<Btn key="d" sm onClick={() => skip(kind)}>Details</Btn>); if (!o) acts.push(<Btn key="r" sm onClick={() => newInsp(L.id, kind)}>Record anyway</Btn>) }
          else if (I) { acts.push(<Btn key="o" sm primary={inspOpen(I)} onClick={() => openInsp(I.id)}>{st === 'Signed' ? 'View' : st === 'Not started' ? 'Open' : 'Continue'}</Btn>); if (!o && inspOpen(I)) acts.push(<Btn key="s" sm onClick={() => skip(kind)}>Skip</Btn>) }
          else if (!o && can) { acts.push(<Btn key="st" sm primary onClick={() => newInsp(L.id, kind)}>Start</Btn>); acts.push(<Btn key="s" sm onClick={() => skip(kind)}>Skip</Btn>) }
          return (
            <TableRow key={kind}>
              <TableCell><b>{IN_KIND[kind]}</b><div className="small muted">{st === 'Skipped' ? `Skipped on ${fmtD(sk.on)} by ${sk.by}` : !I && !can ? 'Starts once notice to vacate is served' : !I ? `No ${name} recorded yet` : st === 'Not started' ? 'Enter the inspection date to start' : L.ref}</div></TableCell>
              <TableCell>{I?.date ? fmtD(I.date) : '—'}</TableCell>
              <TableCell>{sum ? sum.flagged.length : '—'}</TableCell>
              <TableCell className="num">{kind === 'Move-out' && sum ? inr(sum.ded) : '—'}</TableCell>
              <TableCell className="small" sx={{ fontSize: 12.5 }}>{I ? <>{I.tdplSign ? 'TrustLab ✓' : 'TrustLab —'}<br />{I.ownerSign ? 'Owner ✓' : 'Owner —'}</> : '—'}</TableCell>
              <TableCell><StatusChip label={LABEL[st] || st} k={K[st] || 'info'} /></TableCell>
              <TableCell><div className="actions">{acts.length ? acts : <span className="small muted">—</span>}</div></TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </TableCard>
  )
}
