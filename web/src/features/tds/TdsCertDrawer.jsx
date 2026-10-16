/* Owner PAN status and lower / nil deduction certificate (prototype DRAWERS.tdsCert + SUBMIT.tdsCert). */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { owner, closeDrawer, useStore } from '../../store/store'
import { Btn, Empty } from '../../components/ui/Layout'
import { FormGrid, Cell, SectionTitle, TextInput, SelectInput, FileInput } from '../../components/form/Fields'
import { submitTdsCert } from './actions'

export default function TdsCertDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const O = owner(d.id)
  if (!O) return <DrawerLayout title="TDS settings"><Empty>Removed.</Empty></DrawerLayout>
  const c = O.tdsCert || {}
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitTdsCert(O.id, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={`TDS settings · ${O.name}`} sub="PAN status and lower / nil deduction certificate"
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-tcert" disabled={busy}>Save</Btn></>}>
      <form id="f-tcert" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="tce-p" name="pan" label="PAN" defaultValue={O.pan || ''} maxLength={10} upper />
          <SelectInput id="tce-ps" name="panStatus" label="PAN status (as verified on the e-filing portal)" options={['Valid', 'Inoperative', 'Not verified']} defaultValue={O.panStatus || 'Valid'} />
          <TextInput id="tce-pc" name="panCheckedOn" label="Last verified on" type="date" defaultValue={O.panCheckedOn || ''} />
          <Cell />
          <SectionTitle>Certificate for lower / nil deduction</SectionTitle>
          <SelectInput id="tce-t" name="type" label="Type" options={[['', 'None'], ['Lower', 'Lower deduction'], ['Nil', 'Nil deduction']]} defaultValue={c.type || ''} />
          <TextInput id="tce-n" name="certNo" label="Certificate no." defaultValue={c.certNo || ''} />
          <TextInput id="tce-r" name="rate" label="Rate (%)" type="number" defaultValue={c.rate ?? ''} min={0} max={10} step={0.01} />
          <TextInput id="tce-l" name="limit" label="Amount limit (₹)" type="number" defaultValue={c.limit ?? ''} min={0} />
          <TextInput id="tce-f" name="from" label="Valid from" type="date" defaultValue={c.from || ''} />
          <TextInput id="tce-to" name="to" label="Valid to" type="date" defaultValue={c.to || ''} />
          <FileInput id="tce-file" name="files" label="Certificate copy" accept="application/pdf,image/*" hint={c.file ? 'Uploaded — choose a file to replace' : ''} />
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
