/* Owner's "TDS deducted & Form 16A" panel on their Ledgers page (prototype ownerF16). Props: { ownerId } — renders nothing
   when there is no TDS. The quarters come from the API (GET /api/tds/owner/:id/f16 — computed on the server). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import { useStore } from '../../store/store'
import { inr, fmtD } from '../../domain/utils'
import { Panel, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { FileLinks } from '../../components/ui/Media'
import { useOwnerF16 } from './useTdsReport'

export default function OwnerF16({ ownerId }) {
  useStore()
  const { f16 } = useOwnerF16(ownerId)
  if (!ownerId || !f16 || !f16.quarters.length) return null
  return (
    <Panel body={false} title={<h3>TDS deducted &amp; Form 16A</h3>} sub={`TDS credited against your PAN ${f16.pan || ''}. Check it in Form 26AS / AIS.`}>
      <TableCard panel={false}>
        <TableHead><TableRow><TableCell>Quarter</TableCell><TableCell className="num">Rent credited</TableCell><TableCell className="num">TDS</TableCell><TableCell>Form 16A</TableCell></TableRow></TableHead>
        <TableBody>
          {f16.quarters.map(q => (
            <TableRow key={q.fy + q.q}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>FY {q.fy} · Q{q.q}</TableCell>
              <TableCell className="num">{inr(q.base)}</TableCell>
              <TableCell className="num">{inr(q.tds)}</TableCell>
              <TableCell>{q.issuedOn ? <><StatusChip label={'Issued ' + fmtD(q.issuedOn)} k="ok" />{q.file ? <> <FileLinks files={[q.file]} /></> : null}</> : <StatusChip label={'Due ' + fmtD(q.due)} k="idle" />}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableCard>
    </Panel>
  )
}
