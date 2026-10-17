/* Property form submit — ported from reference/TruSpace.html (SUBMIT.property). */
import { UI, prop, save, closeDrawer, emit, toast } from '../../store/store'
import { num } from '../../domain/utils'
import { uploadFiles } from '../../services/files'

/** Owner rows of the property form → [{ ownerId, share }] (empty rows dropped). */
export function readPropertyOwners(fd) {
  const ids = fd.getAll('po-id'), shares = fd.getAll('po-share')
  return ids.map((ownerId, i) => ({ ownerId, share: num(shares[i]) })).filter(o => o.ownerId)
}

export async function submitProperty(fd, id) {
  const owners = readPropertyOwners(fd)
  if (owners.length > 1) {
    const total = owners.reduce((a, o) => a + o.share, 0)
    if (Math.round(total) !== 100) { toast(`The owners’ shares add up to ${Math.round(total)}%. They must total 100%.`, 'error'); return }
    if (new Set(owners.map(o => o.ownerId)).size !== owners.length) { toast('The same owner is listed twice.', 'error'); return }
  }
  let old = id ? prop(id) : { photos: [], docs: [] }
  const photos = (old.photos || []).concat(await uploadFiles(fd.getAll('files').filter(x => x.size)))
  const fv = fd.get('front'); if (fv && fv.size) { const up = await uploadFiles([fv], 1); if (up[0]) old = Object.assign({}, old, { frontPhoto: up[0] }) }
  const P = Object.assign({}, old, { name: fd.get('name'), code: fd.get('code').toUpperCase(), type: fd.get('type'), branch: fd.get('branch'), status: fd.get('status'), address: fd.get('address'), city: fd.get('city'), state: fd.get('state'), area: num(fd.get('area')), floors: fd.get('floors'), meter: fd.get('meter'), ownerId: owners[0]?.ownerId || '', owners: owners.length > 1 ? owners : [], photos })
  await save('properties', P); closeDrawer()
  if (!id) { UI.route = 'property'; UI.sel = P.id; UI.tab = 'summary'; emit() }
}
