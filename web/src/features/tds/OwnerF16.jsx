/* Owner's "TDS deducted & Form 16A" panel on their Ledgers page (prototype ownerF16). Props: { ownerId } — renders nothing when there is no TDS. */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import { owner, useStore } from '../../store/store'
import { inr, fmtD, fy } from '../../domain/utils'
import { tdsDocs, tdsEntries, quarterOf, qDue, F16_DUE } from '../../domain/tds'
import { Panel, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { FileLinks } from '../../components/ui/Media'

export default function OwnerF16({ ownerId }) {
  useStore()
  if (!ownerId) return null
  const out = []; tdsDocs('return').forEach(r => { const x = (r.f16a || {})[ownerId]; if (x && x.issuedOn) out.push({ fy: r.fy, q: r.q, ...x }) })
  const ent = tdsEntries().filter(x => x.ownerId === ownerId)
  if (!ent.length && !out.length) return null
  return (
    <Panel body={false} title={<h3>TDS deducted &amp; Form 16A</h3>} sub={`TDS credited against your PAN ${owner(ownerId)?.pan || ''}. Check it in Form 26AS / AIS.`}>
      <TableCard panel={false}>
        <TableHead><TableRow><TableCell>Quarter</TableCell><TableCell className="num">Rent credited</TableCell><TableCell className="num">TDS</TableCell><TableCell>Form 16A</TableCell></TableRow></TableHead>
        <TableBody>
          {[...new Set(ent.map(x => fy(x.date) + '|' + quarterOf(x.month)))].sort().reverse().map(k => {
            const [f, q] = k.split('|'); const es = ent.filter(x => fy(x.date) === f && quarterOf(x.month) === +q); const c = out.find(o2 => o2.fy === f && o2.q === +q)
            return (
              <TableRow key={k}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>FY {f} · Q{q}</TableCell>
                <TableCell className="num">{inr(es.reduce((a, x) => a + x.base, 0))}</TableCell>
                <TableCell className="num">{inr(es.reduce((a, x) => a + x.tds, 0))}</TableCell>
                <TableCell>{c ? <><StatusChip label={'Issued ' + fmtD(c.issuedOn)} k="ok" />{c.file ? <> <FileLinks files={[c.file]} /></> : null}</> : <StatusChip label={'Due ' + fmtD(qDue(f, +q, F16_DUE))} k="idle" />}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </TableCard>
    </Panel>
  )
}
