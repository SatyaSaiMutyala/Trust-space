/*
 * Portal access: the sign-in accounts (GET/POST/PATCH/DELETE /api/users). Admins and TrustLab staff give people
 * access, disable / enable, unlock, reset passwords and delete accounts; only admins manage staff and admin accounts.
 * The accounts table is a server-side list: search (name, email, mobile), role and status filters, “Created” date range.
 */
import { useState } from 'react'
import Box from '@mui/material/Box'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, APP, owner, partner, role, useStore } from '../../store/store'
import { fmtD, fmtDT } from '../../domain/utils'
import { Btn, PageHead, Panel, Stack, TableCard, Empty } from '../../components/ui/Layout'
import { StatusChip, ConfirmButton } from '../../components/ui/Status'
import { FormGrid, Cell, TextInput, SelectInput } from '../../components/form/Fields'
import { TableSkeleton, Refreshing } from '../../components/ui/Skeletons'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import { ROLE_LABEL, ROLE_CHIP, isStaffRole, createAccount, setAccountStatus, unlockAccount, resetAccountPassword, deleteAccount, approveSignup, declineSignup, editAccount } from './actions'
import { api } from '../../app/api'
import { maskAcct } from '../../domain/lease'

const NW = { whiteSpace: 'nowrap' }
/** Field error from the API, shown as the field's helper text. */
const linkedName = u => u.role === 'owner' ? (u.linkedName || owner(u.ownerId)?.name || '—') : u.role === 'franchisee' ? (u.linkedName || partner(u.partnerId)?.name || '—') : '—'
const loginOf = u => u.email || u.phone || ''

/** A temporary password the API returned once (after create or reset), with a copy button. */
function IssuedPassword({ issued, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = async e => {
    const box = e.currentTarget.closest('[data-issued]')?.querySelector('.copybox')
    try { await navigator.clipboard.writeText(issued.password); setCopied(true) }
    catch { if (box) { const r = document.createRange(); r.selectNodeContents(box); getSelection().removeAllRanges(); getSelection().addRange(r) } }
  }
  return (
    <Box data-issued role="status" sx={{ border: '1px solid color-mix(in srgb,var(--warn) 45%,var(--line))', borderLeft: '4px solid var(--warn)', bgcolor: 'color-mix(in srgb,var(--warn) 7%,var(--surface))', borderRadius: 'var(--r)', p: { xs: 1.5, sm: 2 }, display: 'grid', gap: 1.25 }}>
      <div>
        <b>Temporary password for {issued.name}</b>
        <div className="small muted">Share this securely; it is shown once. They sign in with {issued.login ? <b>{issued.login}</b> : 'their email or mobile'} and should change it after signing in.</div>
      </div>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
        <Box className="copybox" sx={{ flex: '1 1 220px', fontSize: '15px !important', letterSpacing: '.04em' }}>{issued.password}</Box>
        <Btn primary onClick={copy}>{copied ? 'Copied' : 'Copy password'}</Btn>
        <Btn ghost onClick={onClose}>Done</Btn>
      </Box>
    </Box>
  )
}

/** “Give someone access” form → POST /api/users. */
function AccessForm({ isAdmin, onIssued }) {
  const [roleV, setRoleV] = useState(isAdmin ? 'staff' : 'owner')
  const [busy, setBusy] = useState(false)
  const [errs, setErrs] = useState({})
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return
    const f = e.currentTarget; setBusy(true); setErrs({})
    try {
      const res = await createAccount(new FormData(f), err => setErrs(err.errors || {}))
      if (res) {
        if (res.data?.temporaryPassword) onIssued({ name: res.data.name, login: loginOf(res.data), password: res.data.temporaryPassword })
        f.reset(); setRoleV(isAdmin ? 'staff' : 'owner')
      }
    } finally { setBusy(false) }
  }
  const clearErr = e => { const n = e.target.name; if (n && errs[n]) setErrs(x => ({ ...x, [n]: undefined })) }
  const fe = (name, hint) => ({ hint, error: errs[name] })
  const roles = [
    { value: 'staff', label: 'TrustLab staff', disabled: !isAdmin },
    { value: 'admin', label: 'Administrator — admin only', disabled: !isAdmin },
    { value: 'owner', label: 'Owner' },
    { value: 'franchisee', label: 'Franchise partner' },
  ]
  return (
    <form onSubmit={onSubmit} onChange={clearErr} noValidate>
      <FormGrid>
        <TextInput name="name" label="Full name" required autoComplete="off" {...fe('name')} />
        <SelectInput name="role" label="Role" value={roleV} onChange={e => setRoleV(e.target.value)} options={roles}
          {...fe('role', isAdmin ? undefined : 'Only administrators can add TrustLab staff and administrators.')} />
        <TextInput name="email" type="email" label="Email" placeholder="name@example.com" autoComplete="off" {...fe('email', 'Email or mobile — either can be used to sign in.')} />
        <TextInput name="phone" type="tel" label="Mobile" placeholder="98480 11223" inputMode="tel" autoComplete="off" {...fe('phone')} />
        {roleV === 'owner' ? <SelectInput key="o" name="ownerId" label="Owner record" placeholder="Choose the owner" options={S.owners.map(o => [o.id, o.name])} {...fe('ownerId', 'They will see only this owner’s properties.')} /> : null}
        {roleV === 'franchisee' ? <SelectInput key="p" name="partnerId" label="Franchise partner" placeholder="Choose the partner" options={S.partners.map(pa => [pa.id, pa.name])} {...fe('partnerId', 'They will see only this partner’s premises and locations.')} /> : null}
        <TextInput name="password" type="password" label="Password (optional)" autoComplete="new-password" {...fe('password', 'Leave blank to create a temporary password to share with them.')} />
        <Cell full><Btn primary type="submit" disabled={busy}>{busy ? 'Saving…' : 'Give access'}</Btn></Cell>
      </FormGrid>
    </form>
  )
}

/** Owner sign-ups from the app waiting for approval: what they told us, with Approve / Decline. */
function PendingSignups() {
  const q = api.usePendingSignupsQuery()
  const [busy, setBusy] = useState('')
  const rows = q.data?.data || []
  if (!rows.length) return null
  const go = (id, fn) => async () => { if (busy) return; setBusy(id); try { await fn() } finally { setBusy('') } }
  return (
    <Panel title={`Owner sign-ups waiting for approval · ${rows.length}`} sub="Check the PAN, the bank account (cancelled cheque) and link the property before approving. Approving emails the owner that they can sign in.">
      <Box sx={{ display: 'grid', gap: 1.5 }}>
        {rows.map(u => { const o = u.owner || {}; const sg = u.signup || o.signup || {}; return (
          <Box key={u.id} sx={{ border: '1px solid var(--line)', borderLeft: '4px solid var(--warn)', borderRadius: 'var(--r)', p: { xs: 1.5, sm: 2 }, display: 'grid', gap: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1 }}>
              <b>{u.name}</b><span className="small muted">{o.kind || ''} · signed up {fmtDT(u.createdAt)}</span>
              <Box sx={{ ml: 'auto', display: 'flex', gap: .75 }}>
                <Btn primary sm disabled={!!busy} onClick={go(u.id, () => approveSignup(u))}>Approve</Btn>
                <ConfirmButton sm disabled={!!busy} label="Decline" confirmLabel="Click again to decline" onConfirm={go(u.id, () => declineSignup(u))} />
              </Box>
            </Box>
            <div className="facts">
              {[['Email', u.email], ['Mobile', u.phone], ['Property', sg.propertyCode || [sg.propertyName, sg.propertyTown].filter(Boolean).join(', ') || '—'], ['PAN', <span key="p" className="mono">{o.pan || '—'}</span>], ['GSTIN', <span key="g" className="mono">{o.gstin || 'Unregistered'}</span>], ['Bank', `${o.bankName || '—'} ${maskAcct(o.acctNo)} · ${o.ifsc || ''}`], ['Address', o.address || '—'], ['Co-owners', o.coOwners || '—']].map(([l, v]) => <div key={l} className="fact"><div className="l">{l}</div><div className="v">{v}</div></div>)}
            </div>
            <div className="small muted">Documents: {[o.panFile && 'PAN card', o.gstFile && 'GST certificate', o.chequeFile && 'cancelled cheque', o.rep?.poa && 'PoA'].filter(Boolean).join(', ') || 'none uploaded'} — open the owner record under Owners to view them and verify the PAN and bank before approving.</div>
          </Box>) })}
      </Box>
    </Panel>
  )
}

/** Row actions: disable / enable, unlock, reset password, delete. */
function RowActions({ u, me, isAdmin, onIssued }) {
  const [busy, setBusy] = useState(false)
  if (isStaffRole(u.role) && !isAdmin) return <span className="small muted">Admins only</span>
  const self = u.id === me
  const go = fn => async () => { if (busy) return; setBusy(true); try { await fn() } finally { setBusy(false) } }
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .75, justifyContent: 'flex-end', minWidth: 220 }}>
      <Btn sm disabled={busy} onClick={() => editAccount(u)}>Edit</Btn>
      {self ? null : u.status === 'disabled' || u.status === 'pending'
        ? <Btn sm primary={u.status === 'pending'} disabled={busy} onClick={go(() => setAccountStatus(u, 'active'))}>{u.status === 'pending' ? 'Approve' : 'Enable'}</Btn>
        : <Btn sm disabled={busy} onClick={go(() => setAccountStatus(u, 'disabled'))}>Disable</Btn>}
      {u.locked ? <Btn sm disabled={busy} onClick={go(() => unlockAccount(u))}>Unlock</Btn> : null}
      <Btn sm disabled={busy} onClick={go(async () => { const res = await resetAccountPassword(u); if (res?.data?.temporaryPassword) onIssued({ name: u.name, login: loginOf(u), password: res.data.temporaryPassword }) })}>Reset password</Btn>
      {self ? null : <ConfirmButton sm disabled={busy} onConfirm={go(() => deleteAccount(u))} />}
    </Box>
  )
}

export default function AccessPage() {
  useStore()
  const staffSide = role().kind === 'tdpl'
  const L = useServerList('users', 'users', { defaults: { limit: 10 }, skip: !staffSide })
  const [issued, setIssued] = useState(null)
  const me = APP.user?.id; const isAdmin = APP.user?.role === 'admin'
  const showIssued = x => { setIssued(x); requestAnimationFrame(() => document.getElementById('issued')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })) }
  const head = <PageHead title="Portal access" sub="Everyone who can sign in to TruSpace. TrustLab staff and administrators work in the whole TrustLab workspace; owners and franchise partners only see their own premises, with their invoices, tickets and messages." />
  if (!staffSide) return <Stack>{head}<Empty panel>Portal access is managed by the TrustLab Facilities desk.</Empty></Stack>
  return (
    <Stack>
      {head}
      <Panel title="Give someone access" sub="They sign in with their email or mobile number and the password you set or the temporary one shown after saving.">
        <AccessForm isAdmin={isAdmin} onIssued={showIssued} />
      </Panel>
      {issued ? <div id="issued"><IssuedPassword key={issued.password} issued={issued} onClose={() => setIssued(null)} /></div> : null}
      <PendingSignups />
      <section style={{ display: 'grid', gap: 10 }}>
        <h2>Accounts</h2>
        <ListToolbar list={L} searchPlaceholder="Search name, email or mobile" dateLabel="Created">
          <ListFilter list={L} name="role" label="Role" allLabel="Any role" options={Object.entries(ROLE_LABEL)} />
          <ListFilter list={L} name="status" label="Status" allLabel="Any status" width={140} options={[['active', 'Active'], ['pending', 'Waiting for approval'], ['disabled', 'Disabled']]} />
        </ListToolbar>
        {!L.rows.length && L.isFetching ? <TableSkeleton rows={6} cols={6} /> : L.rows.length ? (
          <Refreshing on={L.isFetching}><TableCard>
            <TableHead><TableRow>
              <TableCell>Person</TableCell><TableCell>Role</TableCell><TableCell>Linked to</TableCell><TableCell>Status</TableCell><TableCell>Last sign-in</TableCell><TableCell align="right">Actions</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {L.rows.map(u => (
                <TableRow key={u.id}>
                  <TableCell sx={{ minWidth: 190 }}><b>{u.name}</b>{u.id === me ? <span className="small muted"> · you</span> : null}<div className="small muted" style={{ wordBreak: 'break-all' }}>{[u.email, u.phone].filter(Boolean).join(' · ')}</div></TableCell>
                  <TableCell sx={NW}><StatusChip label={ROLE_LABEL[u.role] || u.role} k={ROLE_CHIP[u.role]} /></TableCell>
                  <TableCell sx={{ minWidth: 140 }}>{linkedName(u)}</TableCell>
                  <TableCell sx={NW}>
                    {u.status === 'disabled' ? <StatusChip label="Disabled" k="idle" /> : u.status === 'pending' ? <StatusChip label="Waiting for approval" k="warn" /> : <StatusChip label="Active" k="ok" />}
                    {u.locked ? <> <StatusChip label="Locked" k="bad" /></> : null}
                  </TableCell>
                  <TableCell className="small" sx={NW}>{u.lastLoginAt ? fmtDT(u.lastLoginAt) : 'Never'}<div className="muted">Added {fmtD(u.createdAt)}</div></TableCell>
                  <TableCell align="right"><RowActions u={u} me={me} isAdmin={isAdmin} onIssued={showIssued} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </TableCard></Refreshing>
        ) : <Empty panel>{L.message || 'No accounts found.'}</Empty>}
        <Pager list={L} />
      </section>
    </Stack>
  )
}
