/*
 * Portal access actions on the accounts API (/api/users). Every outcome is announced in the snackbar with the
 * API's own message. Each action resolves the response body, or null when the API refused (error already shown).
 */
import { callApi } from '../../app/store'
import { toast, openDrawer, closeDrawer } from '../../store/store'

export const ROLE_LABEL = { admin: 'Administrator', staff: 'TrustLab staff', owner: 'Owner', franchisee: 'Franchise partner' }
export const ROLE_CHIP = { admin: 'ok', staff: 'ok', owner: 'info', franchisee: 'warn' }
export const isStaffRole = r => r === 'admin' || r === 'staff'

/** Run an accounts endpoint and show its message. onError(e) receives the error (e.errors = field errors). */
async function run(endpoint, arg, onError) {
  try {
    const res = await callApi(endpoint, arg)
    toast(res.message, 'success')
    return res
  } catch (e) {
    toast(e.message, 'error')
    onError?.(e)
    return null
  }
}

/** POST /api/users from the “Give someone access” form. Blank password = the API issues a temporary one. */
export function createAccount(fd, onError) {
  const role = fd.get('role')
  const body = { name: (fd.get('name') || '').trim(), email: (fd.get('email') || '').trim(), phone: (fd.get('phone') || '').trim(), role }
  if (role === 'owner') body.ownerId = fd.get('ownerId') || ''
  if (role === 'franchisee') body.partnerId = fd.get('partnerId') || ''
  const pw = fd.get('password')
  if (pw) body.password = pw
  for (const k of ['email', 'phone']) if (!body[k]) delete body[k]
  return run('createUser', body, onError)
}

/** Open the edit drawer for an account (the row as listed on Portal access). */
export const editAccount = u => openDrawer({ kind: 'user', user: u })
/** PATCH /api/users/:id from the edit drawer. A blank password keeps the current one. */
export async function updateAccount(u, fd, onError) {
  const role = fd.get('role') || u.role
  const body = { id: u.id, name: (fd.get('name') || '').trim(), email: (fd.get('email') || '').trim(), phone: (fd.get('phone') || '').trim(), role }
  if (role === 'owner') body.ownerId = fd.get('ownerId') || ''
  if (role === 'franchisee') body.partnerId = fd.get('partnerId') || ''
  const pw = fd.get('password')
  if (pw) body.password = pw
  const res = await run('updateUser', body, onError)
  if (res) closeDrawer()
  return res
}
export const setAccountStatus = (u, status) => run('updateUser', { id: u.id, status })
/** Approve a pending owner sign-up (they are emailed) or decline it (the account is removed; the owner record stays). */
export const approveSignup = u => run('updateUser', { id: u.id, status: 'active' })
export const declineSignup = u => run('deleteUser', u.id)
export const unlockAccount = u => run('unlockUser', u.id)
export const resetAccountPassword = u => run('resetUserPassword', u.id)
export const deleteAccount = u => run('deleteUser', u.id)
