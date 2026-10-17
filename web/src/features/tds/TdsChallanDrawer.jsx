/* Record / edit a TDS challan (prototype DRAWERS.tdsChallan + SUBMIT.tdsChallan + ACT.delete). */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { S, remove, closeDrawer, useStore } from '../../store/store'
import { TODAY, CUR, inr, fmtD, perAdd, fy } from '../../domain/utils'
import { useTdsReport } from './useTdsReport'
import { Btn, Empty } from '../../components/ui/Layout'
import { ConfirmButton } from '../../components/ui/Status'
import { FormGrid, TextInput, SelectInput, FileInput } from '../../components/form/Fields'
import { submitTdsChallan } from './actions'

export default function TdsChallanDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const c = d.id ? S.tds.find(x => x.id === d.id) : { month: d.m || perAdd(CUR, -1), paidOn: TODAY, mode: 'Net banking (e-Pay Tax)' }
  const { report } = useTdsReport(c ? fy(c.month + '-01') : null)
  if (!c) return <DrawerLayout title="Edit TDS challan"><Empty>Removed.</Empty></DrawerLayout>
  if (!report) return <DrawerLayout title={d.id ? 'Edit TDS challan' : 'Record TDS challan'}><Empty>Loading…</Empty></DrawerLayout>
  const r = report.rows.find(x => x.m === c.month)
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitTdsChallan(d.id, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={d.id ? 'Edit TDS challan' : 'Record TDS challan'} sub="Challan details from the bank / e-Pay Tax receipt (minor head 200 — TDS payable by taxpayer)."
      footer={<>{d.id ? <ConfirmButton onConfirm={() => { closeDrawer(); remove('tds', d.id) }} /> : null}<Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-tc" disabled={busy}>Save challan</Btn></>}>
      <form id="f-tc" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="tc-m" name="month" label="TDS for month" type="month" defaultValue={c.month} required hint={r ? `Deducted ${inr(r.ded)} · deposited ${inr(r.dep)} · due ${fmtD(r.due)}` : ''} />
          <TextInput id="tc-a" name="amount" label="Amount deposited (₹)" type="number" defaultValue={c.amount ?? (r ? Math.max(0, r.bal) : '')} min={1} required />
          <TextInput id="tc-d" name="paidOn" label="Paid on" type="date" defaultValue={c.paidOn} required />
          <SelectInput id="tc-mode" name="mode" label="Mode" options={['Net banking (e-Pay Tax)', 'Debit card', 'Over the counter', 'RTGS / NEFT']} defaultValue={c.mode} />
          <TextInput id="tc-b" name="bsr" label="BSR code (7 digits)" defaultValue={c.bsr || ''} inputMode="numeric" maxLength={7} required />
          <TextInput id="tc-n" name="challanNo" label="Challan serial no. (5 digits)" defaultValue={c.challanNo || ''} inputMode="numeric" maxLength={5} required />
          <TextInput id="tc-i" name="interest" label="Interest included (₹)" type="number" defaultValue={c.interest || 0} min={0} hint="Interest for late deposit, if paid in the same challan" />
          <FileInput id="tc-f" name="files" label="Challan receipt" accept="application/pdf,image/*" full={false} hint={c.file ? 'Uploaded — choose a file to replace' : ''} />
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
