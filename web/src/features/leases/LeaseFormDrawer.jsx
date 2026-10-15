/* Lease form with live yearly schedule preview — port of DRAWERS.lease + SUBMIT.lease (reference/TruSpace.html). */
import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, isFranchisee, closeDrawer, remove } from '../../store/store'
import { TODAY, addDays, addMonths, dayCount, fmtD } from '../../domain/utils'
import { rentStartOf, schedule, clearSchedCache } from '../../domain/lease'
import { Btn } from '../../components/ui/Layout'
import { ConfirmButton } from '../../components/ui/Status'
import { FileLinks } from '../../components/ui/Media'
import { FormGrid, Cell, SectionTitle, FieldBox, TextInput, SelectInput, CheckField, FileInput } from '../../components/form/Fields'
import { SchedTotals, ScheduleTable } from './LeaseDetail'
import RentByYear from './RentByYear'
import { leaseFromForm, submitLease } from './actions'

function initialLease(d) {
  return d.id ? S.leases.find(l => l.id === d.id) : Object.assign({ start: TODAY, end: addDays(addMonths(TODAY, 60), -1), lockIn: 24, notice: 3, escPct: 5, escEvery: 12, escType: 'Compound', escFrom: 'Lease start', dueDay: 5, payTiming: 'Advance', gstMode: 'Forward', tds: true, maintType: 'Fixed monthly', elec: 'Actuals (sub-meter)', status: 'Draft', fitout: 30, deposit: 0, advanceRent: 0, advanceMonths: 0, ref: (isFranchisee() ? 'FR-LSE-' : 'TDPL-FAC-LSE-') + String(S.leases.length + 1).padStart(3, '0'), propertyId: d.prop || '' }, d.renewFrom || {})
}

export default function LeaseFormDrawer({ d }) {
  useStore()
  const [L] = useState(() => initialLease(d))
  const formRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [pv, setPv] = useState(null)

  const upd = () => {
    const f = formRef.current; if (!f) return
    const x = leaseFromForm(f, { id: '_preview' }); clearSchedCache('_preview'); const sc = schedule(x)
    setPv({ x, sc })
  }
  useEffect(upd, [])
  if (!L) return <DrawerLayout title="Lease">Not found</DrawerLayout>
  const term = Math.round(dayCount(L.start, L.end) / 30.44)

  const onInput = e => {
    const f = formRef.current; const t = e.target
    if (t.id === 'ls-term' && +t.value > 0) f.elements.end.value = addDays(addMonths(f.elements.start.value, +t.value), -1)
    if (t.id === 'ls-depx' && +t.value > 0) f.elements.deposit.value = Math.round(+t.value * (+f.elements.rent.value || 0))
    upd()
  }
  const onSubmit = async e => {
    e.preventDefault(); setBusy(true)
    try { await submitLease(e.currentTarget, new FormData(e.currentTarget), d.id) } finally { setBusy(false) }
  }
  const x = pv?.x; const sc = pv?.sc
  return (
    <DrawerLayout
      title={d.id ? `Edit lease ${L.ref}` : d.renewFrom ? 'Renew lease' : 'Set up lease'}
      sub="Every commercial term of the agreement. The full-term rent schedule below updates as you type."
      footer={<>
        {d.id ? <ConfirmButton onConfirm={() => { closeDrawer(); remove('leases', d.id) }} /> : null}
        <Btn onClick={closeDrawer}>Cancel</Btn>
        <Btn primary type="submit" form="f-lease" disabled={busy} sx={{ whiteSpace: { xs: 'normal', md: 'nowrap' } }}>Save lease &amp; view schedule</Btn>
      </>}>
      <form id="f-lease" ref={formRef} onSubmit={onSubmit} onInput={onInput} onChange={upd}>
        <FormGrid>
          <SectionTitle first>1 · Premises &amp; agreement</SectionTitle>
          <TextInput id="ls-ref" name="ref" label="Lease reference" defaultValue={L.ref} required />
          <SelectInput id="ls-prop" name="propertyId" label="Property" required options={[['', '— choose —'], ...S.properties.map(p => [p.id, `${p.name} (${p.code})`])]} defaultValue={L.propertyId || ''} />
          <SelectInput id="ls-stat" name="status" label="Agreement status" options={[['Draft', 'Draft / term sheet'], ['Active', 'Signed & active']]} defaultValue={L.status === 'Draft' ? 'Draft' : 'Active'} />
          <CheckField id="ls-reg" name="registered" label="Registered with sub-registrar" defaultChecked={L.registered} full={false} />

          <SectionTitle>2 · Term</SectionTitle>
          <TextInput id="ls-st" name="start" label="Lease start (possession) date" type="date" defaultValue={L.start} required />
          <TextInput id="ls-term" name="termMonths" label="Term (months)" type="number" min="1" defaultValue={term} hint="Sets the end date" />
          <TextInput id="ls-en" name="end" label="Lease end date" type="date" defaultValue={L.end} required />
          <TextInput id="ls-ff" name="fitout" label="Rent-free period (days)" type="number" min="0" defaultValue={L.fitout || 0} hint={<>Rent starts <b id="ls-rs">{fmtD(rentStartOf(x || L))}</b></>} />
          <TextInput id="ls-li" name="lockIn" label="Lock-in (months)" type="number" min="0" defaultValue={L.lockIn} />
          <TextInput id="ls-no" name="notice" label="Notice period (months)" type="number" min="0" defaultValue={L.notice} />

          <SectionTitle>3 · Rent &amp; escalation</SectionTitle>
          <TextInput id="ls-rent" name="rent" label="Monthly rent (₹, excl. GST)" type="number" min="0" defaultValue={L.rent} required />
          <SelectInput id="ls-pt" name="payTiming" label="Rent is paid" options={[['Advance', 'In advance — for the current month'], ['Arrears', 'In arrears — after the month ends']]} defaultValue={L.payTiming || 'Advance'} />
          <TextInput id="ls-due" name="dueDay" label="Due by (day of month)" type="number" min="1" max="28" defaultValue={L.dueDay} hint="In arrears: day of the following month" />
          <TextInput id="ls-esc" name="escPct" label="Escalation %" type="number" min="0" step="0.5" defaultValue={L.escPct} />
          <TextInput id="ls-ee" name="escEvery" label="Escalate every (months)" type="number" min="0" defaultValue={L.escEvery} hint="12 = yearly · 36 = once every 3 years" />
          <SelectInput id="ls-et" name="escType" label="Escalation is" options={[['Compound', 'Compounded on last rent'], ['Simple', 'Simple — on original base rent']]} defaultValue={L.escType || 'Compound'} />
          <SelectInput id="ls-ef" name="escFrom" label="Escalation counted from" options={['Lease start', 'Rent commencement']} defaultValue={L.escFrom || 'Lease start'} />

          <SectionTitle>4 · Deposit &amp; advance</SectionTitle>
          <TextInput id="ls-dep" name="deposit" label="Security deposit (₹, refundable)" type="number" min="0" defaultValue={L.deposit} hint={<span id="ls-depm">{x && x.rent ? `= ${(x.deposit / x.rent).toFixed(1)} months’ rent` : ''}</span>} />
          <TextInput id="ls-depx" label="…or as months of rent" type="number" min="0" step="0.5" placeholder="e.g. 6" />
          <CheckField id="ls-dp" name="depositPaid" label="Security deposit paid to owner" defaultChecked={L.depositPaid} />
          <TextInput id="ls-adv" name="advanceRent" label="Advance rent paid at signing (₹)" type="number" min="0" defaultValue={L.advanceRent || 0} hint="Adjusted against monthly rent" />
          <TextInput id="ls-advm" name="advanceMonths" label="Adjust advance over (months)" type="number" min="0" defaultValue={L.advanceMonths || 0} hint="0 = adjust in full against the first rent months" />
          <TextInput id="ls-brk" name="brokerage" label="Brokerage (₹, one-time)" type="number" min="0" defaultValue={L.brokerage || 0} />
          <TextInput id="ls-stamp" name="stamp" label="Stamp duty & registration (₹)" type="number" min="0" defaultValue={L.stamp || 0} />

          <SectionTitle>5 · Other charges</SectionTitle>
          <SelectInput id="ls-mt" name="maintType" label="Maintenance" options={['Fixed monthly', 'Actuals', 'Included in rent', 'None']} defaultValue={L.maintType} />
          <TextInput id="ls-m" name="maint" label="Maintenance (₹/month)" type="number" min="0" defaultValue={L.maint || 0} hint="Charged from lease start, incl. rent-free period" />
          <CheckField id="ls-me" name="maintEsc" label="Maintenance escalates with rent" defaultChecked={L.maintEsc} full={false} />
          <SelectInput id="ls-el" name="elec" label="Electricity" options={['Actuals (sub-meter)', 'Direct DISCOM bill (TDPL)', 'Included in rent', 'Fixed monthly']} defaultValue={L.elec} />

          <SectionTitle>6 · GST &amp; TDS</SectionTitle>
          <SelectInput id="ls-gst" name="gstMode" label="GST on rent" options={[['Forward', 'Owner registered — 18% on invoice'], ['RCM', 'Owner unregistered — TrustLab pays 18% under RCM'], ['None', 'Not applicable']]} defaultValue={L.gstMode} />
          <FieldBox label="TDS">
            <CheckField grid={false} id="ls-tds" name="tds" label="Deduct 10% when rent exceeds ₹50,000/month" defaultChecked={L.tds} />
            <CheckField grid={false} id="ls-tdm" name="tdsOnMaint" label="Also on maintenance paid to owner" defaultChecked={L.tdsOnMaint} />
          </FieldBox>

          <SectionTitle>7 · Clauses &amp; documents</SectionTitle>
          <TextInput id="ls-cl" name="clauses" label="Key clauses & obligations" multiline full defaultValue={L.clauses || ''} placeholder="Repairs split, signage rights, restoration, subletting…" />
          <FileInput id="ls-docs" name="files" label="Signed agreement, annexures, term sheet" accept="application/pdf,image/*" multiple>
            {(L.docs || []).length ? <FileLinks files={L.docs} /> : 'No files yet'}
          </FileInput>
          <Cell full>
            <Box sx={{ borderTop: '1px solid var(--line)', pt: 1.5, mt: 0.5 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Rent schedule preview — yearly</div>
              <div id="ls-prev">{sc && sc.rows.length && +x.rent > 0 ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <RentByYear sc={sc} />
                  <SchedTotals sc={sc} L={x} />
                  <div className="eyebrow" style={{ marginTop: 4 }}>Full breakdown — GST, TDS &amp; net to owner</div>
                  <ScheduleTable sc={sc} L={x} mode="year" />
                </Box>
              ) : <div className="empty">Enter start, end and rent to see the schedule.</div>}</div>
            </Box>
          </Cell>
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
