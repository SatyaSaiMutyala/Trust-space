/* Skip a joint inspection that cannot be recorded — premises TrustLab took over (or handed back) years before TruSpace,
   so there are no photos or signed checklists. Stores L.takeoverSkip / L.handoverSkip = { reason, note, on, by };
   a real inspection can still be recorded later. Skipping a handover moves the exit on to the handover step. */
import { useState } from 'react'
import DrawerLayout from '../../components/app/DrawerLayout'
import { S, prop, closeDrawer, useStore, save, remove, toast, actor } from '../../store/store'
import { TODAY, fmtD } from '../../domain/utils'
import { inspOf, skipKey, SKIP_NOTE_MIN } from '../../domain/inspection'
import { IN_KIND } from '../../domain/constants'
import { Btn, Banner, Empty } from '../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput } from '../../components/form/Fields'

const REASONS = {
  'Move-in': ['Existing lease — TrustLab was already in possession before TruSpace', 'Premises taken over before joint inspections were introduced', 'Inspection done on paper only (record not available)', 'Other'],
  'Move-out': ['Premises already handed back before TruSpace', 'Handover done on paper only (record not available)', 'Owner not available for a joint inspection', 'Other'],
}

export default function SkipInspectionDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const [len, setLen] = useState(0)
  const L = S.leases.find(l => l.id === d.id); const kind = d.insp === 'Move-out' ? 'Move-out' : 'Move-in'
  const name = IN_KIND[kind].toLowerCase() // "take-over inspection" / "handover inspection"
  if (!L) return <DrawerLayout title={`Skip ${name}`}><Empty>Removed.</Empty></DrawerLayout>
  const key = skipKey(kind); const sk = L[key]
  const ex = inspOf(L.id, kind); const stray = ex && ex.status === 'In progress' ? ex : null // started by mistake — discarded on skip
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return
    const fd = new FormData(e.currentTarget); const note = (fd.get('note') || '').trim()
    if (note.length < SKIP_NOTE_MIN) { toast(`Add a note of at least ${SKIP_NOTE_MIN} characters saying why there is no ${name} record.`, 'warning'); return }
    setBusy(true)
    try {
      L[key] = { reason: fd.get('reason'), note, on: TODAY, by: actor() }
      if (kind === 'Move-out' && L.exit && (L.exit.stage || 1) < 2) { L.exit.stage = 2; L.exit.inspectionDate = TODAY; L.exit.inspectionNotes = `Handover inspection skipped — ${note}` }
      if (stray) await remove('inspections', stray.id)
      await save('leases', L, true); closeDrawer(); toast(`${IN_KIND[kind]} skipped for ${L.ref}`, 'success')
    } finally { setBusy(false) }
  }
  const undo = async () => {
    if (busy) return; setBusy(true)
    try { delete L[key]; if (kind === 'Move-out' && L.exit && L.exit.stage === 2 && !L.exit.inspectionId) { L.exit.stage = 1; delete L.exit.inspectionDate; delete L.exit.inspectionNotes } await save('leases', L, true); closeDrawer(); toast(`${IN_KIND[kind]} is due again for ${L.ref}`) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={sk ? `${IN_KIND[kind]} skipped` : `Skip ${name}`} sub={`${prop(L.propertyId)?.name} · ${L.ref} · ${kind === 'Move-in' ? 'possession ' + fmtD(L.start) : 'vacate by ' + fmtD(L.exit?.effective || L.end)}`}
      footer={sk
        ? <><Btn onClick={closeDrawer}>Close</Btn><Btn onClick={undo} disabled={busy}>Undo — inspection is due</Btn></>
        : <><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-skip" disabled={busy}>Skip inspection</Btn></>}>
      {sk ? (
        <>
          <Banner>Skipped on <b>{fmtD(sk.on)}</b> by {sk.by}.<br /><b>{sk.reason}</b><br />{sk.note}</Banner>
          <p className="small muted">{kind === 'Move-in' ? 'You can still record a take-over inspection any time from Take-over & handover; the handover inspection at exit will then have a baseline to compare against.' : 'You can still record a handover inspection from Take-over & handover; its findings will then flow into the deposit settlement.'}</p>
        </>
      ) : (
        <>
          <Banner>{kind === 'Move-in'
            ? 'Use this for agreements that were already running when the premises came into TruSpace. The lease carries on as normal — rent, ledgers and exit are unaffected — only the take-over inspection reminder is cleared. The handover inspection at exit will have no take-over baseline.'
            : 'Use this when the premises were handed back without a joint inspection record. The exit moves on to the handover step; any deductions from the deposit must then be entered by hand in the settlement.'}</Banner>
          {stray ? <Banner tone="warn">The {name} started on <b>{fmtD(stray.date)}</b> is still in progress (not submitted or signed). Skipping removes that record.</Banner> : null}
          <form id="f-skip" onSubmit={onSubmit} onInput={e => { if (e.target.name === 'note') setLen(e.target.value.trim().length) }}>
            <FormGrid>
              <SelectInput id="sk-r" name="reason" label="Reason" full options={REASONS[kind]} defaultValue={REASONS[kind][0]} />
              <TextInput id="sk-n" name="note" label={`Note — why there is no ${name} record (at least ${SKIP_NOTE_MIN} characters)`} full multiline required htmlInput={{ minLength: SKIP_NOTE_MIN }}
                placeholder={kind === 'Move-in' ? 'e.g. Premises occupied since 2023; condition at possession is recorded in the signed agreement annexure, no photos were taken' : 'e.g. Keys returned to the owner on 30 Nov 2026 in person; no joint checklist was prepared and no damages were claimed'}
                hint={<span style={{ color: len && len < SKIP_NOTE_MIN ? 'var(--bad)' : undefined }}>{len} / {SKIP_NOTE_MIN} characters minimum</span>} />
            </FormGrid>
          </form>
        </>
      )}
    </DrawerLayout>
  )
}
