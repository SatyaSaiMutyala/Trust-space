/* Owner agreements (prototype viewODocs). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import { S, prop, inScope, scopeProps, useStore } from '../../store/store'
import { inr, fmtD, by, CUR } from '../../domain/utils'
import { rentFor, leaseState } from '../../domain/lease'
import { PageHead, Panel, TableCard, ClickRow } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import LeaseDetail from '../leases/LeaseDetail'
import InspectionTable from '../inspections/InspectionTable'

const agrJump = id => { const el = document.getElementById('agr-' + id); if (el) el.scrollIntoView({ behavior: 'smooth' }) }

export default function OwnerDocsPage() {
  useStore()
  const props = scopeProps()
  const rows = S.leases.filter(inScope).sort(by('start', -1))
  return (
    <>
      <PageHead title="Agreements" sub="Every agreement you have with TrustLab: signed copies, commercial terms, the full-term rent schedule and joint inspection reports." />
      <SampleBanner />
      <TableCard>
        <TableHead><TableRow><TableCell>Agreement</TableCell><TableCell>Premises</TableCell><TableCell>Term</TableCell><TableCell className="num">Rent now</TableCell><TableCell className="num">Deposit</TableCell><TableCell>Signed copy</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.length ? rows.map(L => (
            <ClickRow key={L.id} onClick={() => agrJump(L.id)}>
              <TableCell className="mono">{L.ref}</TableCell>
              <TableCell>{prop(L.propertyId)?.name || ''}</TableCell>
              <TableCell className="small">{fmtD(L.start)} –<br />{fmtD(L.end)}</TableCell>
              <TableCell className="num">{inr(rentFor(L, CUR))}</TableCell>
              <TableCell className="num">{inr(L.deposit)}</TableCell>
              <TableCell className="small">{(L.docs || []).length ? (L.docs || []).length + ' file(s)' : <span className="muted">Not uploaded</span>}</TableCell>
              <TableCell><StatusChip label={leaseState(L)} /></TableCell>
            </ClickRow>
          )) : <TableRow><TableCell colSpan={7} className="empty">No agreements.</TableCell></TableRow>}
        </TableBody>
      </TableCard>
      {props.map(P => S.leases.filter(l => l.propertyId === P.id).sort(by('start', -1)).map(L => {
        const ins = S.inspections.filter(i => i.leaseId === L.id)
        return [
          <div key={L.id + 'h'} id={`agr-${L.id}`} style={{ scrollMarginTop: 70 }}><h2 style={{ marginTop: 6 }}>{P.name} <span className="code">{L.ref}</span></h2></div>,
          <LeaseDetail key={L.id + 'd'} L={L} />,
          ins.length ? <Panel key={L.id + 'i'} body={false} title={<h3>Joint inspection reports</h3>}><InspectionTable list={ins} pid={P.id} /></Panel> : null,
        ]
      }))}
    </>
  )
}
