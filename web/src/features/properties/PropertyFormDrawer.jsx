/* Property form — port of DRAWERS.property + SUBMIT.property (reference/TruSpace.html). */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, prop, isOwner, closeDrawer, remove } from '../../store/store'
import { newOwner } from '../../store/actions'
import { TYPES, PSTAT } from '../../domain/constants'
import { fileUrl } from '../../services/files'
import { Btn, ActLink } from '../../components/ui/Layout'
import { ConfirmButton } from '../../components/ui/Status'
import { PhotoStrip } from '../../components/ui/Media'
import { FormGrid, TextInput, SelectInput, FileInput } from '../../components/form/Fields'
import { submitProperty } from './actions'

export default function PropertyFormDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const P = (d.id ? prop(d.id) : null) || { status: 'Pipeline', type: 'Collection centre', state: 'Telangana', photos: [], docs: [] }
  const onSubmit = async e => {
    e.preventDefault(); setBusy(true)
    try { await submitProperty(new FormData(e.currentTarget), d.id) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={d.id ? 'Edit property' : 'Add property'}
      footer={<>
        {d.id && !isOwner() ? <ConfirmButton onConfirm={() => { closeDrawer(); remove('properties', d.id) }} /> : null}
        <Btn onClick={closeDrawer}>Cancel</Btn>
        <Btn primary type="submit" form="f-prop" disabled={busy}>Save property</Btn>
      </>}>
      <form id="f-prop" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="pr-name" name="name" label="Property name" defaultValue={P.name} required full />
          <TextInput id="pr-code" name="code" label="Site code" defaultValue={P.code} required placeholder="HYD-BGP-01" hint="City–locality–number" />
          <SelectInput id="pr-type" name="type" label="Use" options={TYPES} defaultValue={P.type} />
          <TextInput id="pr-branch" name="branch" label="Branch / hub" defaultValue={P.branch} />
          <SelectInput id="pr-status" name="status" label="Status" options={PSTAT} defaultValue={P.status} />
          <TextInput id="pr-addr" name="address" label="Address" defaultValue={P.address} required full />
          <TextInput id="pr-city" name="city" label="City" defaultValue={P.city} required />
          <TextInput id="pr-state" name="state" label="State" defaultValue={P.state} />
          <TextInput id="pr-area" name="area" label="Carpet / chargeable area (sq ft)" type="number" min="0" defaultValue={P.area} />
          <TextInput id="pr-floors" name="floors" label="Floors" defaultValue={P.floors} />
          <TextInput id="pr-meter" name="meter" label="Electricity service / meter no." defaultValue={P.meter} />
          <SelectInput id="pr-owner" name="ownerId" label="Owner" options={[['', '— choose —'], ...S.owners.map(o => [o.id, o.name])]} defaultValue={P.ownerId || ''}
            hint={<ActLink onClick={newOwner}>Add a new owner</ActLink>} />
          <FileInput id="pr-fv" name="front" label="Front-view photo (shown on the property card)" accept="image/*" capture="environment">
            {P.frontPhoto ? <img src={fileUrl(P.frontPhoto)} alt="" style={{ width: 120, height: 80, objectFit: 'cover', borderRadius: 6 }} /> : 'None — the scouting front view is used if available'}
          </FileInput>
          <FileInput id="pr-ph" name="files" label="Other photos (signage, interiors)" accept="image/*,video/*" multiple hint="Photos or videos. New photos are added to the existing set.">
            <PhotoStrip files={P.photos} empty="None yet" />
          </FileInput>
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
