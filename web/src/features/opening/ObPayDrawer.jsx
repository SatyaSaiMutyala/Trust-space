/* Record a payment against an opening-balance month (prototype DRAWERS.obPay + SUBMIT.obPay + ACT.obUnpay). */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { S, prop, owner, closeDrawer, useStore } from '../../store/store'
import { TODAY, inr, perLabel } from '../../domain/utils'
import { OB_DATE, obItems, schedRow, tdsRate, panValid } from '../../domain/lease'
import { Btn, Empty } from '../../components/ui/Layout'
import { FormGrid, TextInput } from '../../components/form/Fields'
import { submitObPay, obUnpay } from './actions'

export default function ObPayDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const L = S.leases.find(l => l.id === d.lease); const it = L && obItems(L).find(x => x.id === d.item)
  if (!it) return <DrawerLayout title="Payment"><Empty>Removed.</Empty></DrawerLayout>
  const rS = schedRow(L, it.period)?.split?.find(x => x.ownerId === it.ownerId)
  const tdsS = it.type === 'Rent' && rS?.tdsOn ? Math.round((+it.amount || 0) / (rS.mode === 'Forward' ? 1.18 : 1) * tdsRate(it.ownerId, it.paidOn || TODAY) / 100) : 0
  const run = fn => async () => { if (busy) return; setBusy(true); try { await fn() } finally { setBusy(false) } }
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitObPay(L.id, it.id, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={`${it.type} ${perLabel(it.period)} · opening balance`} sub={`${prop(L.propertyId)?.name || ''} · ${owner(it.ownerId)?.name || ''} · due ${inr(it.amount)}`}
      footer={<>{+it.paidAmount ? <Btn danger disabled={busy} onClick={run(() => obUnpay(L.id, it.id))}>Undo payment</Btn> : null}<Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-obp" disabled={busy}>Record payment</Btn></>}>
      <form id="f-obp" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="obp-d" name="paidOn" label="Paid on" type="date" defaultValue={it.paidOn || TODAY} min={OB_DATE} required />
          <TextInput id="obp-u" name="utr" label="UTR / reference" defaultValue={it.utr || ''} required />
          <TextInput id="obp-a" name="paidAmount" label="Amount transferred (₹)" type="number" defaultValue={it.paidAmount ?? ((+it.amount || 0) - tdsS)} min={0} required />
          <TextInput id="obp-t" name="tds" label="TDS deducted (₹)" type="number" defaultValue={it.tds ?? tdsS} min={0} hint={tdsS ? `${tdsRate(it.ownerId, it.paidOn || TODAY)}% on rent as per lease${panValid(owner(it.ownerId)) ? '' : ' — 20% as the owner has no valid PAN'}` : ''} />
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
