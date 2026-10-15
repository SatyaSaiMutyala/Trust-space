/* Serve notice of termination (prototype DRAWERS.exitStart + SUBMIT.exitStart). */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { S, prop, closeDrawer, useStore } from '../../store/store'
import { lockEnd } from '../../domain/lease'
import { TODAY, addMonths, fmtD } from '../../domain/utils'
import { Btn, Banner, Empty } from '../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput, CheckField } from '../../components/form/Fields'
import { submitExitStart } from './actions'

export default function ExitStartDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const L = S.leases.find(l => l.id === d.id)
  if (!L) return <DrawerLayout title="Serve notice of termination"><Empty>Removed.</Empty></DrawerLayout>
  const le = lockEnd(L)
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitExitStart(L.id, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title="Serve notice of termination" sub={`${prop(L.propertyId)?.name} · ${L.ref} · ${L.notice} months notice`}
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-ex" disabled={busy}>Serve notice</Btn></>}>
      {le && le > TODAY ? <Banner>Lock-in runs until <b>{fmtD(le)}</b>. Exiting earlier may make the remaining lock-in rent payable — check clause terms.</Banner> : null}
      <form id="f-ex" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="es-d" name="noticeDate" label="Notice date" type="date" defaultValue={TODAY} required />
          <SelectInput id="es-b" name="noticeBy" label="Served by" options={['TrustLab', 'Owner']} defaultValue="TrustLab" />
          <TextInput id="es-e" name="effective" label="Effective (vacate) date" type="date" defaultValue={addMonths(TODAY, L.notice || 3)} required hint={`Default: notice date + ${L.notice} months`} />
          <TextInput id="es-r" name="reason" label="Reason" required full multiline />
          <CheckField id="es-s" name="send" label="Send the formal notice to the owner in TruSpace messages" defaultChecked />
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
