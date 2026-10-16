/* Mark a quarterly TDS return filed (prototype DRAWERS.tdsReturn + SUBMIT.tdsReturn). */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { closeDrawer, useStore } from '../../store/store'
import { TODAY, fmtD } from '../../domain/utils'
import { tdsDocs, qDue, RET_DUE } from '../../domain/tds'
import { Btn } from '../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput, FileInput } from '../../components/form/Fields'
import { tdsv, submitTdsReturn } from './actions'

export default function TdsReturnDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const f = tdsv().fy; const ret = tdsDocs('return').find(r => r.fy === f && r.q === +d.q) || {}
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitTdsReturn(d.q, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={`TDS return · FY ${f} Q${d.q}`} sub={`Due ${fmtD(qDue(f, +d.q, RET_DUE))}`}
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-tr" disabled={busy}>Save</Btn></>}>
      <form id="f-tr" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="tr-d" name="filedOn" label="Filed on" type="date" defaultValue={ret.filedOn || TODAY} required />
          <SelectInput id="tr-t" name="rtype" label="Type" options={['Original', 'Correction']} defaultValue={ret.rtype || 'Original'} />
          <TextInput id="tr-a" name="ack" label="Token / acknowledgement no. (15 digits)" defaultValue={ret.ack || ''} inputMode="numeric" maxLength={15} required full />
          <TextInput id="tr-by" name="filedBy" label="Filed by" defaultValue={ret.filedBy || ''} placeholder="e.g. CA firm / Accounts Payable" />
          <FileInput id="tr-f" name="files" label="Acknowledgement" accept="application/pdf,image/*" full={false} />
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
