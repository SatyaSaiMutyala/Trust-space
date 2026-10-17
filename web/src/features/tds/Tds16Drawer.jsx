/* Form 16A issued per owner for a quarter (prototype DRAWERS.tds16 + SUBMIT.tds16). */
import { useState } from 'react'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import DrawerLayout from '../../components/app/DrawerLayout'
import { owner, useStore } from '../../store/store'
import { TODAY, inr, fmtD } from '../../domain/utils'
import { useTdsReport } from './useTdsReport'
import { Btn, Empty, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { FileLinks } from '../../components/ui/Media'
import { TextInput } from '../../components/form/Fields'
import { tdsv, submitTds16 } from './actions'

/** "Mark issued" form for one owner. */
function IssueForm({ q, oid }) {
  const [busy, setBusy] = useState(false)
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitTds16(q, oid, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <form className="filters" onSubmit={onSubmit}>
      <TextInput grid={false} type="date" name="issuedOn" defaultValue={TODAY} required htmlInput={{ 'aria-label': 'Issued on' }} sx={{ width: 160 }} />
      <input type="file" name="files" accept="application/pdf" aria-label="Form 16A PDF" style={{ maxWidth: 220 }} />
      <Btn sm primary type="submit" disabled={busy}>Mark issued</Btn>
    </form>
  )
}

export default function Tds16Drawer({ d }) {
  useStore()
  const f = tdsv().fy; const { report, isLoading } = useTdsReport(f); const Q = report?.quarters.find(x => x.q === +d.q)
  if (!Q) return <DrawerLayout title="Form 16A"><Empty>{isLoading ? 'Loading…' : 'Not found.'}</Empty></DrawerLayout>
  return (
    <DrawerLayout title={`Form 16A · FY ${f} Q${d.q}`} sub={`Due ${fmtD(Q.f16)} · ${Q.issued} of ${Q.owners.length} issued${Q.st !== 'Filed' ? ' · file the return first' : ''}`}>
      <TableCard>
        <TableHead><TableRow><TableCell>Owner</TableCell><TableCell>PAN</TableCell><TableCell className="num">Rent credited</TableCell><TableCell className="num">TDS</TableCell><TableCell>Form 16A</TableCell></TableRow></TableHead>
        <TableBody>
          {Q.owners.map(oid => {
            const es = Q.es.filter(x => x.ownerId === oid); const x = Q.iss[oid]
            return (
              <TableRow key={oid}>
                <TableCell><b>{owner(oid)?.name || ''}</b></TableCell>
                <TableCell className="mono">{owner(oid)?.pan || '—'}</TableCell>
                <TableCell className="num">{inr(es.reduce((a, y) => a + y.base, 0))}</TableCell>
                <TableCell className="num">{inr(es.reduce((a, y) => a + y.tds, 0))}</TableCell>
                <TableCell>{x?.issuedOn ? <><StatusChip label={'Issued ' + fmtD(x.issuedOn)} k="ok" />{x.file ? <> <FileLinks files={[x.file]} /></> : null}</> : <IssueForm q={d.q} oid={oid} />}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </TableCard>
      <p className="small muted" style={{ margin: 0 }}>Download Form 16A from TRACES and attach it — the owner sees it in their portal under Ledgers.</p>
    </DrawerLayout>
  )
}
