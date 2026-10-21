/* Extend a lease: the same agreement running longer (an addendum or extension letter). Asks only for the new end date,
   an optional revised rent that applies from the day after the current end, and the addendum. Everything else on the
   lease — invoices raised, deposit, owners, co-shares, TDS — is untouched. Recorded in L.extensions (see actions.js). */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, prop, closeDrawer } from '../../store/store'
import { Btn, Banner, Empty } from '../../components/ui/Layout'
import { FormGrid, TextInput, FileInput } from '../../components/form/Fields'
import { TODAY, addDays, addMonths, fmtD, inr, num } from '../../domain/utils'
import { rentFor, rentStartOf, escOn, escLabel } from '../../domain/lease'
import { submitExtension } from './actions'

export default function ExtendDrawer({ d }) {
  useStore()
  const L = S.leases.find(l => l.id === d.id)
  const [busy, setBusy] = useState(false)
  const [rent, setRent] = useState('')
  const [end, setEnd] = useState(() => (L ? addMonths(L.end, 36) : TODAY))
  if (!L) return <DrawerLayout title="Extend lease"><Empty>Lease not found.</Empty></DrawerLayout>
  const P = prop(L.propertyId); const from = addDays(L.end, 1); const nowRent = rentFor(L, L.end.slice(0, 7))
  const months = end > L.end ? Math.max(0, Math.round((new Date(end) - new Date(L.end)) / (30.44 * 864e5))) : 0
  const onSubmit = async e => { e.preventDefault(); if (busy) return; setBusy(true); try { await submitExtension(L.id, new FormData(e.currentTarget)) } finally { setBusy(false) } }
  return (
    <DrawerLayout title="Extend lease" sub={`${P?.name || ''} · ${L.ref} · currently ${fmtD(L.start)} – ${fmtD(L.end)}`}
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-ext" disabled={busy || end <= L.end}>{busy ? 'Saving…' : 'Extend lease'}</Btn></>}>
      <form id="f-ext" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="ex-end" name="end" label="New end date" type="date" value={end} onChange={e => setEnd(e.target.value)} min={addDays(L.end, 1)} required hint={end > L.end ? `About ${months} more month${months === 1 ? '' : 's'} from ${fmtD(from)}` : `Must be after ${fmtD(L.end)}`} />
          <TextInput id="ex-rent" name="rent" label="Revised monthly rent from the extension (₹)" type="number" min="0" value={rent} onChange={e => setRent(e.target.value)} placeholder={`Blank = keep the schedule (${inr(nowRent)} now)`} hint={rent ? `${inr(num(rent))} from ${fmtD(from)}${escOn(L) ? `, then ${escLabel(L)} counted from that date` : ''}` : `Rent continues as per the agreement: ${inr(nowRent)} in ${fmtD(L.end).slice(3)}${escOn(L) ? `, rising ${escLabel(L)} as before` : ''}`} />
          <TextInput id="ex-ref" name="ref" label="Addendum / extension letter reference" placeholder="e.g. Addendum 1 dated 12 Oct 2026" full />
          <FileInput id="ex-file" name="file" label="Signed addendum (PDF or photo)" accept="application/pdf,image/*" hint="Optional — stored with the lease documents"><span className="muted small">Optional</span></FileInput>
        </FormGrid>
      </form>
      <Banner>The lease reference stays {L.ref}. Invoices already raised, the ledger, TDS, the deposit and the owners’ split are not changed. Notice and lock-in dates recalculate from the new end, and every owner is notified.{rentStartOf(L) > L.end ? '' : ''}</Banner>
      {(L.extensions || []).length ? <div><div className="eyebrow" style={{ marginBottom: 4 }}>Earlier extensions</div><div className="list">{L.extensions.map(x => <div key={x.id} className="li"><span className="when">{fmtD(x.at)}</span><div className="grow"><div>{fmtD(x.fromEnd)} → {fmtD(x.toEnd)}{+x.rent > 0 ? ` · rent ${inr(x.rent)} from ${fmtD(x.rentFrom)}` : ''}</div><div className="small muted">{x.ref || 'No reference'} · {x.by}</div></div></div>)}</div></div> : null}
    </DrawerLayout>
  )
}
