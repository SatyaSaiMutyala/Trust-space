/* Add / edit franchise partner (prototype DRAWERS.partner + SUBMIT.partner). */
import { useState } from 'react'
import { useStore, partner, closeDrawer } from '../../store/store'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn } from '../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput, CheckField } from '../../components/form/Fields'
import { submitPartner } from './actions'

export default function PartnerDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const pa = (d.id ? partner(d.id) : null) || { model: 'Franchise collection centre', status: 'Active' }
  const onSubmit = async e => { e.preventDefault(); setBusy(true); try { await submitPartner(d.id, new FormData(e.currentTarget)) } finally { setBusy(false) } }
  return (
    <DrawerLayout
      title={d.id ? 'Edit franchise partner' : 'Add franchise partner'}
      sub="The franchisee signs the premises lease directly with the owner. TrustLab assesses and approves the location only."
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-pa" disabled={busy}>Save partner</Btn></>}
    >
      <form id="f-pa" onSubmit={onSubmit} key={d.id || 'new'}>
        <FormGrid>
          <TextInput id="pa-n" name="name" label="Partner / firm name" defaultValue={pa.name} required full />
          <TextInput id="pa-c" name="contact" label="Contact person" defaultValue={pa.contact} />
          <TextInput id="pa-ph" name="phone" label="Mobile" type="tel" defaultValue={pa.phone} />
          <TextInput id="pa-em" name="email" label="Email" type="email" defaultValue={pa.email} />
          <TextInput id="pa-city" name="city" label="Based in" defaultValue={pa.city} />
          <SelectInput id="pa-m" name="model" label="Franchise model" options={['Franchise collection centre', 'Franchise lab', 'Both']} defaultValue={pa.model} />
          <TextInput id="pa-ref" name="agreementRef" label="Franchise agreement ref." defaultValue={pa.agreementRef} placeholder="With TrustLab (separate from premises lease)" />
          <SelectInput id="pa-st" name="status" label="Status" options={['Prospect', 'Active', 'Suspended', 'Exited']} defaultValue={pa.status} />
          <CheckField id="pa-pm" name="premisesMgmt" defaultChecked={!!pa.premisesMgmt} label="Partner uses TruSpace to manage its premises from agreement to termination (leases, rent, inspections, repairs, exits — kept separate from TrustLab’s)" />
          <TextInput id="pa-nt" name="notes" label="Notes" multiline full defaultValue={pa.notes || ''} />
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
