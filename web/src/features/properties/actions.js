/* Property form submit — ported from reference/TruSpace.html (SUBMIT.property). */
import { UI, prop, save, closeDrawer, emit } from '../../store/store'
import { num } from '../../domain/utils'
import { uploadFiles } from '../../services/files'

export async function submitProperty(fd, id) {
  let old = id ? prop(id) : { photos: [], docs: [] }
  const photos = (old.photos || []).concat(await uploadFiles(fd.getAll('files').filter(x => x.size)))
  const fv = fd.get('front'); if (fv && fv.size) { const up = await uploadFiles([fv], 1); if (up[0]) old = Object.assign({}, old, { frontPhoto: up[0] }) }
  const P = Object.assign({}, old, { name: fd.get('name'), code: fd.get('code').toUpperCase(), type: fd.get('type'), branch: fd.get('branch'), status: fd.get('status'), address: fd.get('address'), city: fd.get('city'), state: fd.get('state'), area: num(fd.get('area')), floors: fd.get('floors'), meter: fd.get('meter'), ownerId: fd.get('ownerId'), photos })
  await save('properties', P); closeDrawer()
  if (!id) { UI.route = 'property'; UI.sel = P.id; UI.tab = 'summary'; emit() }
}
