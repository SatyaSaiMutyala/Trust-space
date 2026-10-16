/* Invoice document, workflow and payment (prototype DRAWERS.invoiceView + invDoc + invStep / invReject / SUBMIT.reject / SUBMIT.pay). */
import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import { S, prop, owner, partner, tenantOf, isOwner, remove, closeDrawer, useStore } from '../../store/store'
import { newInvoice, depAdjOpen } from '../../store/actions'
import { inr, fmtD, perLabel, TODAY } from '../../domain/utils'
import { invState, maskAcct, depHeld } from '../../domain/lease'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn, Panel, Cols } from '../../components/ui/Layout'
import { StatusChip, Timeline, ConfirmButton } from '../../components/ui/Status'
import { PhotoStrip } from '../../components/ui/Media'
import { FormGrid, Cell, TextInput } from '../../components/form/Fields'
import { invStep, dlInvoice, rejectInvoice, payInvoice } from './actions'

/** The invoice as a printable document (prototype invDoc). */
export function InvDoc({ i, P, O, L }) {
  const grey = { fontSize: 12, color: '#555' }
  return (
    <div className="invdoc">
      <div className="split">
        <div>
          <div style={{ fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: '#666' }}>{i.gst ? 'Tax invoice' : 'Invoice'}{i.source === 'Uploaded' ? ' · uploaded copy on file' : ''}</div>
          <h2>{O?.name || ''}</h2><div>{O?.address || ''}</div><div>PAN {O?.pan || '—'}{O?.gstin ? ' · GSTIN ' + O.gstin : ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}><div><b>No.</b> <span className="mono">{i.number}</span></div><div><b>Date</b> {fmtD(i.date)}</div><div><b>Due</b> {fmtD(i.dueDate)}</div><div><b>Period</b> {perLabel(i.period)}</div></div>
      </div>
      <div><b>Bill to</b><br />{P && P.managedBy === 'franchise'
        ? <>{tenantOf(P)}<br />{partner(P.partnerId)?.city || ''} · TrustLab franchise partner</>
        : <>TrustLab Diagnostics Private Limited<br />#31, Street No. 5, Prakash Nagar, Begumpet, Hyderabad – 500016<br />CIN U85100TG2020PTC143059</>}</div>
      <div><b>Premises</b> {P?.name || ''} ({P?.code || ''}), {P?.address || ''}, {P?.city || ''}{L ? ` · Lease ${L.ref}` : ''}</div>
      <div style={{ overflowX: 'auto' }}><Box component="table" sx={{ '& th': { fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', fontWeight: 600, whiteSpace: 'nowrap' }, '& td': { fontSize: 13.5 } }}><thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th></tr></thead><tbody>
        <tr><td>{i.desc || `${i.type} for ${perLabel(i.period)}`}{i.type === 'Rent' ? ' · SAC 997212' : ''}</td><td className="num">{inr(i.base)}</td></tr>
        {i.gst ? <tr><td>{P?.state === 'Telangana' && (O?.gstin || '').startsWith('36') ? 'CGST 9% + SGST 9%' : 'IGST 18%'}</td><td className="num">{inr(i.gst)}</td></tr> : null}
        <tr className="tot"><td>Invoice total</td><td className="num">{inr(i.total)}</td></tr>
        {i.tds ? <tr><td>Less: TDS {i.base ? Math.round(i.tds / i.base * 1000) / 10 : 10}% to be deducted by TrustLab</td><td className="num">−{inr(i.tds)}</td></tr> : null}
        <tr className="tot"><td>Net payable</td><td className="num">{inr(i.net)}</td></tr>
      </tbody></Box></div>
      {i.rcm ? <div style={grey}>GST on this supply is payable by the recipient under reverse charge (owner not registered under GST).</div> : null}
      <div style={grey}>Payment to: {O?.acctHolder || O?.name || ''} · {[O?.bankName, O?.bankBranch].filter(Boolean).join(', ') || O?.bank || 'bank as per lease'}{O?.acctNo ? ' · A/c ' + maskAcct(O.acctNo) + ' · IFSC ' + (O.ifsc || '') : ''}</div>
    </div>
  )
}

function RejectForm({ id, onDone }) {
  const [busy, setBusy] = useState(false); const ref = useRef(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <Panel id="rejForm">
      <form style={{ display: 'grid', gap: 8 }} onSubmit={async e => { e.preventDefault(); setBusy(true); try { await rejectInvoice(id, new FormData(e.currentTarget)); onDone() } finally { setBusy(false) } }}>
        <label htmlFor="rj-r" className="eyebrow">Reason the owner will see</label>
        <TextInput grid={false} multiline id="rj-r" name="reason" required placeholder="e.g. Rent amount differs from lease escalation; GSTIN missing" htmlInput={{ ref }} />
        <div><Btn danger type="submit" disabled={busy}>Reject invoice</Btn></div>
      </form>
    </Panel>
  )
}

function PayForm({ i, L }) {
  const [busy, setBusy] = useState(false)
  return (
    <Panel title={<h3>Record payment</h3>}>
      <form onSubmit={async e => { e.preventDefault(); setBusy(true); try { await payInvoice(i.id, new FormData(e.currentTarget)) } finally { setBusy(false) } }}>
        <FormGrid>
          <TextInput id="py-d" name="paidDate" label="Paid on" type="date" defaultValue={TODAY} required />
          <TextInput id="py-u" name="utr" label="UTR / reference" defaultValue="" required />
          <TextInput id="py-a" name="paidAmount" label="Amount transferred (₹)" type="number" defaultValue={i.net} required />
          <TextInput id="py-t" name="tdsDeducted" label="TDS deducted (₹)" type="number" defaultValue={i.tds} />
          <Cell full><div className="actions"><Btn primary type="submit" disabled={busy}>Mark paid</Btn>{i.type === 'Rent' && L && +L.deposit && depHeld(L, i.ownerId) > 0 ? <Btn onClick={() => depAdjOpen(L.id, [{ period: i.period, ownerId: i.ownerId }])}>Settle from security deposit instead</Btn> : null}</div></Cell>
        </FormGrid>
      </form>
    </Panel>
  )
}

/* Long footer labels may wrap on phones instead of overflowing the half-width button. */
const WRAP = { whiteSpace: { xs: 'normal', md: 'nowrap' } }

export default function InvoiceViewDrawer({ d }) {
  useStore()
  const [rej, setRej] = useState(false)
  const i = S.invoices.find(x => x.id === d.id)
  if (!i) return <DrawerLayout title="Invoice"><div className="empty">This invoice was removed.</div></DrawerLayout>
  const P = prop(i.propertyId), O = owner(i.ownerId), L = S.leases.find(l => l.id === i.leaseId); const st = invState(i); const o = isOwner()
  const acts = []
  if (!o) {
    if (i.status === 'Submitted') acts.push(<Btn primary key="v" sx={WRAP} onClick={() => invStep(i.id, 'Verified')}>Verify (Accounts Payable)</Btn>)
    if (i.status === 'Verified') acts.push(<Btn primary key="a" sx={WRAP} onClick={() => invStep(i.id, 'Approved')}>Approve for payment (CMD)</Btn>)
    if (['Submitted', 'Verified'].includes(i.status)) acts.push(<Btn danger key="r" onClick={() => setRej(true)}>Reject</Btn>)
  } else if (i.status === 'Rejected') acts.push(<Btn primary key="c" sx={WRAP} onClick={() => newInvoice({ prop: i.propertyId, type: i.type, period: i.period })}>Raise corrected invoice</Btn>)
  return (
    <DrawerLayout
      title={`${i.type} · ${i.number}`}
      sub={<>{P?.name || ''} · {perLabel(i.period)} · <StatusChip label={st} /></>}
      footer={<>
        <Btn onClick={() => dlInvoice(i.id)}>Download invoice</Btn>
        {acts}
        {!o || i.status === 'Submitted' ? <ConfirmButton onConfirm={() => { closeDrawer(); remove('invoices', i.id) }} /> : null}
      </>}>
      <InvDoc i={i} P={P} O={O} L={L} />
      <Cols n={2}>
        <Panel title={<h3>Workflow</h3>}>
          <Timeline entries={i.log || []} />
          {i.reason ? <p style={{ color: 'var(--bad)' }}>Rejected: {i.reason}</p> : null}
        </Panel>
        <Panel title={<h3>Attachments</h3>}>
          {(i.files || []).length ? <PhotoStrip files={i.files} /> : <span className="muted small">None</span>}
        </Panel>
      </Cols>
      {!o && i.status === 'Approved' ? <PayForm i={i} L={L} /> : null}
      {rej && ['Submitted', 'Verified'].includes(i.status) ? <RejectForm id={i.id} onDone={() => setRej(false)} /> : null}
    </DrawerLayout>
  )
}
