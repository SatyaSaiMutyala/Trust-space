/* Edit a portal account (Portal access → Edit): name, sign-in email and mobile, role, the linked owner or partner, and
   optionally a new password. Administrators may edit anyone; TrustLab staff only owners and franchise partners (the API
   enforces the same). A new password signs that person out everywhere. */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, APP, closeDrawer } from '../../store/store'
import { Btn, Banner } from '../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput } from '../../components/form/Fields'
import { updateAccount, isStaffRole } from './actions'

export default function EditUserDrawer({ d }) {
  useStore()
  const u = d.user
  const isAdmin = APP.user?.role === 'admin'; const self = u && u.id === APP.user?.id
  const [roleV, setRoleV] = useState(u?.role || 'owner')
  const [busy, setBusy] = useState(false)
  const [errs, setErrs] = useState({})
  if (!u) return <DrawerLayout title="Edit account">Not found.</DrawerLayout>
  const canEdit = isAdmin || !isStaffRole(u.role)
  const onSubmit = async e => { e.preventDefault(); if (busy) return; setBusy(true); setErrs({}); try { await updateAccount(u, new FormData(e.currentTarget), err => setErrs(err.errors || {})) } finally { setBusy(false) } }
  const clearErr = e => { const n = e.target.name; if (n && errs[n]) setErrs(x => ({ ...x, [n]: undefined })) }
  const fe = (name, hint) => ({ hint, error: errs[name] })
  const roles = [
    { value: 'staff', label: 'TrustLab staff', disabled: !isAdmin },
    { value: 'admin', label: 'Administrator — admin only', disabled: !isAdmin },
    { value: 'owner', label: 'Owner' },
    { value: 'franchisee', label: 'Franchise partner' },
  ]
  return (
    <DrawerLayout title={`Edit account · ${u.name}`} sub={self ? 'This is your own account. Role and status cannot be changed here.' : 'Changes apply at once. A new password signs them out everywhere.'}
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-user" disabled={busy || !canEdit}>{busy ? 'Saving…' : 'Save changes'}</Btn></>}>
      {!canEdit ? <Banner tone="bad">Only administrators can change TrustLab staff and administrator accounts.</Banner> : null}
      <form id="f-user" onSubmit={onSubmit} onChange={clearErr} noValidate>
        <FormGrid>
          <TextInput name="name" label="Full name" defaultValue={u.name} required autoComplete="off" disabled={!canEdit} {...fe('name')} />
          <SelectInput name="role" label="Role" value={roleV} onChange={e => setRoleV(e.target.value)} options={roles} disabled={!canEdit || self} {...fe('role', self ? 'You cannot change your own role' : undefined)} />
          <TextInput name="email" type="email" label="Email" defaultValue={u.email || ''} placeholder="name@example.com" autoComplete="off" disabled={!canEdit} {...fe('email', 'Email or mobile — either can be used to sign in')} />
          <TextInput name="phone" type="tel" label="Mobile" defaultValue={u.phone || ''} placeholder="98480 11223" inputMode="tel" autoComplete="off" disabled={!canEdit} {...fe('phone')} />
          {roleV === 'owner' ? <SelectInput key="o" name="ownerId" label="Owner record" placeholder="Choose the owner" defaultValue={u.ownerId || ''} options={S.owners.map(o => [o.id, o.name + (o.pan ? ' · ' + o.pan : '')])} disabled={!canEdit} {...fe('ownerId')} /> : null}
          {roleV === 'franchisee' ? <SelectInput key="p" name="partnerId" label="Franchise partner" placeholder="Choose the partner" defaultValue={u.partnerId || ''} options={S.partners.map(pa => [pa.id, pa.name])} disabled={!canEdit} {...fe('partnerId')} /> : null}
          <TextInput name="password" type="password" label="New password (optional)" autoComplete="new-password" disabled={!canEdit} {...fe('password', 'Leave blank to keep the current password. At least 8 characters with a letter and a number.')} />
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
