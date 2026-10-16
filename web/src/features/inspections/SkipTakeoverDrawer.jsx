/* Skip the take-over inspection for a lease TrustLab already occupies (old agreements brought into TruSpace).
   Stores L.takeoverSkip = { reason, note, on, by }; a real take-over inspection can still be recorded later. */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { S, prop, closeDrawer, useStore, save, toast, actor } from '../../store/store'
import { TODAY, fmtD } from '../../domain/utils'
import { Btn, Banner, Empty } from '../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput } from '../../components/form/Fields'

const REASONS = ['Existing lease — TrustLab was already in possession before TruSpace', 'Premises taken over before joint inspections were introduced', 'Inspection done on paper only (record not available)', 'Other']

export default function SkipTakeoverDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const L = S.leases.find(l => l.id === d.id)
  if (!L) return <DrawerLayout title="Skip take-over inspection"><Empty>Removed.</Empty></DrawerLayout>
  const sk = L.takeoverSkip
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try {
      const fd = new FormData(e.currentTarget)
      L.takeoverSkip = { reason: fd.get('reason'), note: (fd.get('note') || '').trim(), on: TODAY, by: actor() }
      await save('leases', L, true); closeDrawer(); toast('Take-over inspection skipped for ' + L.ref, 'success')
    } finally { setBusy(false) }
  }
  const undo = async () => { if (busy) return; setBusy(true); try { delete L.takeoverSkip; await save('leases', L, true); closeDrawer(); toast('Take-over inspection is due again for ' + L.ref) } finally { setBusy(false) } }
  return (
    <DrawerLayout title={sk ? 'Take-over inspection skipped' : 'Skip take-over inspection'} sub={`${prop(L.propertyId)?.name} · ${L.ref} · possession ${fmtD(L.start)}`}
      footer={sk
        ? <><Btn onClick={closeDrawer}>Close</Btn><Btn onClick={undo} disabled={busy}>Undo — inspection is due</Btn></>
        : <><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-skip" disabled={busy}>Skip inspection</Btn></>}>
      {sk ? (
        <>
          <Banner>Skipped on <b>{fmtD(sk.on)}</b> by {sk.by}.<br /><b>{sk.reason}</b>{sk.note ? <><br />{sk.note}</> : null}</Banner>
          <p className="small muted">You can still record a take-over inspection any time from Take-over &amp; handover; the handover inspection at exit will then have a baseline to compare against.</p>
        </>
      ) : (
        <>
          <Banner>Use this for agreements that were already running when the premises came into TruSpace. The lease carries on as normal — rent, ledgers and exit are unaffected — only the take-over inspection reminder is cleared. The handover inspection at exit will have no take-over baseline.</Banner>
          <form id="f-skip" onSubmit={onSubmit}>
            <FormGrid>
              <SelectInput id="sk-r" name="reason" label="Reason" full options={REASONS} defaultValue={REASONS[0]} />
              <TextInput id="sk-n" name="note" label="Note (optional)" full multiline placeholder="e.g. Condition at possession recorded in the signed agreement annexure" />
            </FormGrid>
          </form>
        </>
      )}
    </DrawerLayout>
  )
}
