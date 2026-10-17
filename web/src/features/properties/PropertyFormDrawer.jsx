/* Property form — port of DRAWERS.property + SUBMIT.property (reference/TruSpace.html). */
import { useRef, useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, prop, isOwner, closeDrawer, remove } from '../../store/store'
import { TYPES, PSTAT } from '../../domain/constants'
import { fileUrl } from '../../services/files'
import { Btn } from '../../components/ui/Layout'
import { ConfirmButton } from '../../components/ui/Status'
import { PhotoStrip } from '../../components/ui/Media'
import { FormGrid, Cell, TextInput, SelectInput, FileInput } from '../../components/form/Fields'
import PropertyOwnerRows, { propertyOwners, evenShares } from './PropertyOwnerRows'
import { submitProperty } from './actions'

let SEQ = 0

export default function PropertyFormDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)
  const P = (d.id ? prop(d.id) : null) || { status: 'Pipeline', type: 'Collection centre', state: 'Telangana', photos: [], docs: [] }
  // Owner rows stay uncontrolled; the row list only grows/shrinks here. Shares are re-split evenly when a row is added or removed.
  const [rows, setRows] = useState(() => { const os = propertyOwners(P); return (os.length ? os : [{ ownerId: '', share: 100 }]).map(o => ({ key: ++SEQ, ...o })) })
  const [total, setTotal] = useState(100)
  const shareFields = () => [...(formRef.current?.querySelectorAll('[name="po-share"]') || [])]
  const sumShares = () => setTotal(shareFields().reduce((a, el) => a + (+el.value || 0), 0))
  const resplit = n => { const sh = evenShares(n); setTimeout(() => { shareFields().forEach((el, i) => { if (el.type !== 'hidden') el.value = sh[i] }); sumShares() }, 0) }
  const addOwner = () => { const n = rows.length + 1; setRows(r => r.concat({ key: ++SEQ, ownerId: '', share: evenShares(n)[n - 1] })); resplit(n) }
  const delOwner = key => { const n = rows.length - 1; setRows(r => r.filter(x => x.key !== key)); resplit(n) }
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
      <form id="f-prop" ref={formRef} onSubmit={onSubmit} onInput={e => { if (e.target.name === 'po-share') sumShares() }}>
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
          <Cell full><div className="eyebrow" style={{ marginBottom: 6 }}>Owners</div><PropertyOwnerRows rows={rows} total={total} onAdd={addOwner} onDel={delOwner} /></Cell>
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
