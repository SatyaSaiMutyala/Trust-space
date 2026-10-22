/* Lease form with co-owners and live yearly schedule preview — port of DRAWERS.lease, ownerRowHTML, ownerRowsHTML, ACT.lsAddOwner/lsDelOwner + SUBMIT.lease (prototype). */
import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, isFranchisee, closeDrawer, remove, prop, owner, toast } from '../../store/store'
import { TODAY, CUR, addDays, addMonths, dayCount, fmtD, num, perAdd, perLabel, inr } from '../../domain/utils'
import { rentStartOf, schedule, clearSchedCache, splitAmt } from '../../domain/lease'
import { Btn } from '../../components/ui/Layout'
import { ConfirmButton } from '../../components/ui/Status'
import { FormGrid, Cell, SectionTitle, FieldBox, TextInput, SelectInput, CheckField } from '../../components/form/Fields'
import { SchedTotals, ScheduleTable, TimingNote } from './LeaseDetail'
import RentByYear from './RentByYear'
import { leaseFromForm, submitLease, ownerSums, readOwnerAmounts, formTotals, amountsFromShares, totalFieldOf, SHARE_KEYS } from './actions'
import OwnerRows from './OwnerRows'
import RentStepRows from './RentStepRows'
import { resolvedRentSteps, escOn, escLabel, rentFor, escAnchor, stepUpLabel } from '../../domain/lease'

/** The rule in words plus the first few escalations with their reason, like the rent-escalation mock-up. */
function escFormula(L) {
  if (!escOn(L)) return 'No escalation: the rent stays at the base for the whole term.'
  const p = +L.escPct || 0, every = +L.escEvery || 12, e = every === 12 ? 'year' : `${every} months`
  const rule = L.escType === 'Simple' ? `New rent = base × (1 + ${p}% × n) · adds ${inr(Math.round((+L.rent || 0) * p / 100))} every ${e}`
    : L.escType === 'Amount' ? `New rent = base + ${inr(L.escAdd)} × n · adds ${inr(L.escAdd)} every ${e}`
    : L.escType === 'StepUp' ? `Escalation ${Math.max(1, +L.stepAt || 1)}: base revised (${stepUpLabel(L)}) · then +${p}% every ${e} ${L.stepOn === 'simple' ? 'of the revised base' : 'on the last rent'}`
    : `New rent = last rent × (1 + ${p}%) · the rupee increase grows every ${e}`
  const a = escAnchor(L); const lines = []
  for (let k = 0; k < 5 && lines.length < 5; k++) { const d = addMonths(a, every * k); if (d > L.end) break; const r = rentFor(L, d.slice(0, 7)); const prev = k ? rentFor(L, addMonths(a, every * (k - 1)).slice(0, 7)) : null; lines.push(`${perLabel(d.slice(0, 7))}: ${inr(r)}  (${k === 0 ? 'base rent' : r === prev ? 'no change' : `+${inr(r - prev)}`})`) }
  return rule + '\n' + lines.join('\n') + (addMonths(a, every * 5) <= L.end ? '\n…' : '')
}

let SEQ = 0 // keys for co-owner rows

/** What the chosen timing means for this month's rent (prototype timingHint). */
function timingHint(pt, day) {
  const d = String(day || 5).padStart(2, '0'), nx = perAdd(CUR, 1)
  if (pt === 'Arrears') return `${perLabel(CUR)} rent becomes a liability on ${fmtD(addDays(nx + '-01', -1))}, is billed in ${perLabel(nx)} and due by ${fmtD(nx + '-' + d)}.`
  if (pt === 'Advance') return `${perLabel(CUR)} rent is billed in ${perLabel(CUR)} and due by ${fmtD(CUR + '-' + d)}.`
  return 'Choose one — it decides the billing month and the month-end liability in the rent schedule.'
}

function initialLease(d) {
  return d.id ? S.leases.find(l => l.id === d.id) : Object.assign({ start: TODAY, end: addDays(addMonths(TODAY, 60), -1), lockIn: 24, lockInLessor: 24, notice: 3, noticeLessor: 3, escPct: 5, escEvery: 12, escType: 'Compound', escFrom: 'Lease start', dueDay: 5, payTiming: '', gstMode: 'Forward', tds: true, maintType: 'Fixed monthly', elec: 'Actuals (sub-meter)', status: 'Draft', fitout: 30, deposit: 0, advanceRent: 0, advanceMonths: 0, ref: (isFranchisee() ? 'FR-LSE-' : 'TDPL-FAC-LSE-') + String(S.leases.length + 1).padStart(3, '0'), propertyId: d.prop || '' }, d.renewFrom || {})
}

/** Owner rows for a lease that has none yet: the property's owners with their % shares (one row at 100% otherwise). */
function ownersFromProperty(pid, fallbackOwnerId) {
  const P = prop(pid); const os = P && Array.isArray(P.owners) && P.owners.length > 1 ? P.owners : null
  if (os) return os.map(o => ({ ownerId: o.ownerId, rent: +o.share || 0, maint: +o.share || 0, dep: +o.share || 0, adv: +o.share || 0, gst: '' }))
  return [{ ownerId: fallbackOwnerId || P?.ownerId || '', rent: 100, maint: 100, dep: 100, adv: 100, gst: '' }]
}

const DEP_CHANNELS = ['NEFT', 'RTGS', 'IMPS', 'UPI', 'Cheque', 'Demand draft', 'Cash', 'Other']

export default function LeaseFormDrawer({ d }) {
  useStore()
  const [L] = useState(() => initialLease(d))
  const formRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [pv, setPv] = useState(null)
  const [sums, setSums] = useState({})
  // Owner shares are entered as ₹ amounts: start from the lease's % shares applied to its own totals.
  const pctRef = useRef(null) // % shares the rows came from (property co-owners) — used to split a total typed into an empty form
  const [rows, setRows] = useState(() => {
    const owners = L && L.owners && L.owners.length ? L.owners : ownersFromProperty(L && (L.propertyId || ''), L && L.ownerId)
    if (owners.length > 1 && !(L && L.owners && L.owners.length)) pctRef.current = owners.map(o => +o.rent || 0)
    return amountsFromShares(owners, L ? { rent: +L.rent || 0, maint: +L.maint || 0, dep: +L.deposit || 0, adv: +L.advanceRent || 0 } : {}).map(o => ({ key: ++SEQ, o }))
  })
  const [escType, setEscType] = useState(L.escType || 'Compound')
  const [stepKind, setStepKind] = useState(L.stepKind || 'amt')
  const [steps, setSteps] = useState(() => (Array.isArray(L.rentSteps) ? L.rentSteps : []).map(s => ({ key: ++SEQ, s })))
  const [same] = useState(() => !(L && L.owners && L.owners.length) || L.owners.every(o => ['maint', 'dep', 'adv'].every(k => +o[k] === +o.rent)))
  const lastTotals = useRef(null) // totals the owners' amounts were last split from — to rescale them when a total changes

  const upd = () => {
    const f = formRef.current; if (!f) return
    const x = leaseFromForm(f, { id: '_preview' }); clearSchedCache('_preview'); const sc = schedule(x)
    setPv({ x, sc }); setSums(ownerSums(f))
    if (!lastTotals.current) lastTotals.current = formTotals(f)
  }
  useEffect(upd, [rows, steps]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!L) return <DrawerLayout title="Lease">Not found</DrawerLayout>
  const term = Math.round(dayCount(L.start, L.end) / 30.44)

  /* Co-owner rows: values stay uncontrolled; these handlers write into the row's fields like the prototype. */
  const orows = () => [...formRef.current.querySelectorAll('.orow')]
  const fld = (tr, k) => tr.querySelector(`[name="o-${k}"]`)
  const sameOn = () => !!formRef.current.querySelector('#ls-same')?.checked
  /** Even split of every total over n owners (₹, rounding to the last owner). */
  const evenSplit = n => { const T = formTotals(formRef.current); const eq = Array.from({ length: n }, () => ({ p: 100 / n })); const per = {}; SHARE_KEYS.forEach(k => { per[k] = splitAmt(Math.round(T[k]), eq, 'p') }); return per }
  /** Write amounts into every row: per[k][i] = ₹ for row i. */
  const writeAll = per => orows().forEach((tr, i) => SHARE_KEYS.forEach(k => { if (per[k] && per[k][i] !== undefined) fld(tr, k).value = per[k][i] }))
  const addOwner = () => {
    const all = orows(); const n = all.length + 1; const per = evenSplit(n)
    if (sameOn()) writeAll(per)
    if (n === 2) { const g = fld(all[0], 'gst'); const O = owner(fld(all[0], 'id').value); if (O && !g.value) g.value = O.gstin ? 'Forward' : 'RCM' }
    setRows(r => r.concat({ key: ++SEQ, o: { ownerId: '', rent: per.rent[n - 1], maint: per.maint[n - 1], dep: per.dep[n - 1], adv: per.adv[n - 1], gst: '' } }))
  }
  const delOwner = key => {
    if (rows.length <= 1) { toast('A lease needs at least one owner.', 'warning'); return }
    const rest = rows.filter(r => r.key !== key)
    if (rest.length === 1) { const tr = orows().find(t => t.dataset.key === String(rest[0].key)); const T = formTotals(formRef.current); SHARE_KEYS.forEach(k => { fld(tr, k).value = T[k] }) }
    setRows(rest)
  }
  /** "Same split for every charge": maintenance, deposit and advance follow each owner's share of the rent.
      While the rent column doesn't add up yet, only the edited row follows; once it does, every row is rebalanced exactly. */
  const followRent = tr => {
    const A = readOwnerAmounts(formRef.current); const T = formTotals(formRef.current); if (!(T.rent > 0) || A.length !== orows().length) return
    const rentSum = A.reduce((a, o) => a + o.rent, 0)
    if (Math.abs(rentSum - T.rent) >= 1) { if (tr) { const r = num(fld(tr, 'rent').value) / T.rent; ['maint', 'dep', 'adv'].forEach(k => { fld(tr, k).value = Math.round(r * T[k]) }) } return }
    const sh = A.map(o => ({ p: o.rent / T.rent * 100 })); const per = {}; ['maint', 'dep', 'adv'].forEach(k => { per[k] = splitAmt(Math.round(T[k]), sh, 'p') }); writeAll(per)
  }
  /** A total changed (rent, maintenance, deposit, advance): keep each owner's share and rescale their amounts; a sole owner takes it all. */
  const rescale = k => {
    const f = formRef.current; const T = formTotals(f); const prev = lastTotals.current?.[k]; const trs = orows()
    if (trs.length === 1) { fld(trs[0], k).value = T[k]; return }
    const A = readOwnerAmounts(f); if (A.length !== trs.length) return
    const pct = pctRef.current && pctRef.current.length === A.length ? pctRef.current : null
    const base = prev > 0 ? A.map(o => ({ p: o[k] / prev * 100 })) : T.rent > 0 && k !== 'rent' ? A.map(o => ({ p: o.rent / T.rent * 100 })) : pct ? pct.map(p => ({ p })) : A.map(() => ({ p: 100 / A.length }))
    const amt = splitAmt(Math.round(T[k]), base, 'p'); trs.forEach((tr, i) => { fld(tr, k).value = amt[i] })
  }

  const onInput = e => {
    const f = formRef.current; const t = e.target
    // Term: start date + term (months) set the end date; typing an end date sets the term.
    if ((t.id === 'ls-term' || t.id === 'ls-st') && +f.elements.termMonths.value > 0 && f.elements.start.value) f.elements.end.value = addDays(addMonths(f.elements.start.value, +f.elements.termMonths.value), -1)
    if (t.id === 'ls-en' && f.elements.start.value && t.value > f.elements.start.value) f.elements.termMonths.value = Math.round(dayCount(f.elements.start.value, t.value) / 30.44)
    if (t.id === 'ls-depx' && +t.value > 0) { f.elements.deposit.value = Math.round(+t.value * (+f.elements.rent.value || 0)); rescale('dep') }
    const k = SHARE_KEYS.find(x => totalFieldOf(x) === t.name); if (k) { rescale(k); if (k === 'rent' && sameOn() && orows().length > 1) followRent() }
    // An owner's amount changed: the lease total (monthly rent, maintenance, deposit, advance) is the sum of the owners' amounts.
    const ok = t.closest('.orow') && SHARE_KEYS.find(x => t.name === `o-${x}`)
    if (ok) { f.elements[totalFieldOf(ok)].value = orows().reduce((a, tr) => a + num(fld(tr, ok).value), 0); if (ok === 'rent' && sameOn()) followRent(t.closest('.orow')) }
    lastTotals.current = formTotals(f)
    upd()
  }
  const onChange = e => {
    const f = formRef.current; const t = e.target
    if (t.id === 'ls-et') setEscType(t.value)
    if (t.id === 'ls-sk') setStepKind(t.value)
    if (t.name === 'o-id') { const O = owner(t.value); const g = fld(t.closest('.orow'), 'gst'); if (O && orows().length > 1) g.value = O.gstin ? 'Forward' : 'RCM' }
    if (t.id === 'ls-prop') {
      const rs = orows(); const P = prop(t.value)
      if (P && !d.id && (rs.length === 1 && !fld(rs[0], 'id').value || rs.every(tr => !fld(tr, 'id').value))) {
        // No owners picked yet: take them from the property (co-owners with their shares, or the single owner).
        const os = ownersFromProperty(P.id)
        pctRef.current = os.length > 1 ? os.map(o => +o.rent || 0) : null
        if (os.length > 1) { setRows(amountsFromShares(os, formTotals(f)).map(o => ({ key: ++SEQ, o }))) } else fld(rs[0], 'id').value = os[0].ownerId
      }
    }
    if (f) upd()
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
      <form id="f-lease" ref={formRef} onSubmit={onSubmit} onInput={onInput} onChange={onChange}>
        <FormGrid>
          <SectionTitle first>1 · Premises &amp; agreement</SectionTitle>
          <TextInput id="ls-ref" name="ref" label="Lease reference" defaultValue={L.ref} required />
          <SelectInput id="ls-prop" name="propertyId" label="Property" required options={[['', '— choose —'], ...S.properties.map(p => [p.id, `${p.name} (${p.code})`])]} defaultValue={L.propertyId || ''} />
          <SelectInput id="ls-stat" name="status" label="Agreement status" options={[['Draft', 'Draft / term sheet'], ['Active', 'Signed & active']]} defaultValue={L.status === 'Draft' ? 'Draft' : 'Active'} />
          <CheckField id="ls-reg" name="registered" label="Registered with sub-registrar" defaultChecked={L.registered} full={false} />

          <SectionTitle>Owners &amp; share of payments</SectionTitle>
          <Cell full><OwnerRows rows={rows} same={same} sums={sums} onAdd={addOwner} onDel={delOwner} /></Cell>

          <SectionTitle>2 · Term</SectionTitle>
          <TextInput id="ls-st" name="start" label="Lease start (possession) date" type="date" defaultValue={L.start} required />
          <TextInput id="ls-term" name="termMonths" label="Term (months)" type="number" min="1" defaultValue={term} hint="Sets the end date" />
          <TextInput id="ls-en" name="end" label="Lease end date" type="date" defaultValue={L.end} required />
          <TextInput id="ls-ff" name="fitout" label="Rent-free period (days)" type="number" min="0" defaultValue={L.fitout || 0} hint={<>Rent starts <b id="ls-rs">{fmtD(rentStartOf(x || L))}</b></>} />
          <TextInput id="ls-li" name="lockIn" label="Lock-in for lessee — tenant (months)" type="number" min="0" defaultValue={L.lockIn} hint="The tenant cannot exit before this" />
          <TextInput id="ls-lil" name="lockInLessor" label="Lock-in for lessor — owner (months)" type="number" min="0" defaultValue={L.lockInLessor ?? L.lockIn} hint="The owner cannot end the lease before this" />
          <TextInput id="ls-no" name="notice" label="Notice by lessee — tenant (months)" type="number" min="0" defaultValue={L.notice} hint="To end or not renew the lease" />
          <TextInput id="ls-nol" name="noticeLessor" label="Notice by lessor — owner (months)" type="number" min="0" defaultValue={L.noticeLessor ?? L.notice} hint="Often longer than the tenant’s" />

          <SectionTitle>3 · Rent &amp; escalation</SectionTitle>
          <TextInput id="ls-rent" name="rent" label="Monthly rent (₹, excl. GST)" type="number" min="0" defaultValue={L.rent} required />
          <SelectInput id="ls-pt" name="payTiming" label="Is rent paid in advance or in arrears?" required options={[['', 'Select — required'], ['Advance', 'In advance — billed & paid in the same month'], ['Arrears', 'In arrears — liability at month-end, billed next month']]} defaultValue={L.payTiming || ''} hint={timingHint(x ? x.payTiming : L.payTiming, x ? x.dueDay : L.dueDay)} />
          <TextInput id="ls-due" name="dueDay" label="Due by (day of month)" type="number" min="1" max="28" defaultValue={L.dueDay} hint="Advance: of the same month · Arrears: of the following month" />
          <SelectInput id="ls-et" name="escType" label="How does the rent go up?" full options={[['Compound', 'A % compounded on the last rent — each increase is on the rent just before it'], ['Simple', 'A % of the original base rent — the same rupee increase each time'], ['Amount', 'A fixed ₹ amount added each time'], ['StepUp', 'A step-up in base, then % thereafter — one revision of the base rent, then a % on the revised rent']]} defaultValue={L.escType || 'Compound'} />
          <TextInput id="ls-ee" name="escEvery" label="Escalate every (months)" type="number" min="0" defaultValue={L.escEvery} hint="12 = yearly · 36 = once every 3 years" />
          <SelectInput id="ls-ef" name="escFrom" label="Escalation counted from" options={['Lease start', 'Rent commencement']} defaultValue={L.escFrom || 'Lease start'} />
          {escType === 'StepUp' ? <>
            <SelectInput id="ls-sk" name="stepKind" label="Base step-up as" options={[['amt', '₹ amount added'], ['pct', '% of the base'], ['new', 'New rent']]} defaultValue={L.stepKind || 'amt'} />
            <TextInput id="ls-sv" name="stepValue" label={stepKind === 'pct' ? 'Step-up (%)' : stepKind === 'new' ? 'Revised base rent (₹)' : 'Step-up (₹ per month)'} type="number" min="0" defaultValue={L.stepValue || ''} />
            <TextInput id="ls-sa" name="stepAt" label="Applied at escalation no." type="number" min="1" step="1" defaultValue={L.stepAt || 1} hint="1 = the first escalation; the rent stays at the base until then" />
            <TextInput id="ls-esc" name="escPct" label="Then escalation %" type="number" min="0" step="0.5" defaultValue={L.escPct} />
            <SelectInput id="ls-so" name="stepOn" label="% applied on" options={[['compound', 'Last rent (compounded)'], ['simple', 'Revised base (simple)']]} defaultValue={L.stepOn || 'compound'} />
          </> : <>
            <TextInput id="ls-esc" name="escPct" label="Escalation %" type="number" min="0" step="0.5" defaultValue={L.escPct} disabled={escType === 'Amount'} hint={escType === 'Simple' ? 'Of the original base rent, every time' : escType === 'Amount' ? 'Not used for a fixed amount' : 'On the rent just before each increase'} />
            <TextInput id="ls-esca" name="escAdd" label="Increase each time (₹ per month)" type="number" min="0" step="100" defaultValue={L.escAdd || ''} disabled={escType !== 'Amount'} hint="e.g. 3000 = rent goes up by ₹3,000/month every time" />
          </>}
          <Cell full><div className="formula small" style={{ whiteSpace: 'pre-line', fontFamily: 'var(--f-mono)', background: 'var(--sunk)', borderRadius: 6, padding: '8px 10px' }}>{escFormula(x || L)}</div></Cell>
          <Cell full><FieldBox id="ls-steps" label="Rent changes as per the agreement (irregular patterns)" full>
            <RentStepRows rows={steps} resolved={x ? resolvedRentSteps(x) : []} hasRule={!!(x && x.escEvery && (x.escType === 'Amount' ? x.escAdd > 0 : x.escPct > 0))} onAdd={() => setSteps(r => r.concat([{ key: ++SEQ, s: { id: `rs${Date.now().toString(36)}${r.length}`, from: '', kind: 'pct', value: '' } }]))} onDel={key => setSteps(r => r.filter(z => z.key !== key))} />
          </FieldBox></Cell>

          <SectionTitle>4 · Deposit &amp; advance</SectionTitle>
          <TextInput id="ls-dep" name="deposit" label="Security deposit (₹, refundable)" type="number" min="0" defaultValue={L.deposit} hint={<span id="ls-depm">{x && x.rent ? `= ${(x.deposit / x.rent).toFixed(1)} months’ rent` : ''}</span>} />
          <TextInput id="ls-depx" label="…or as months of rent" type="number" min="0" step="0.5" placeholder="e.g. 6" />
          <CheckField id="ls-dp" name="depositPaid" label="Security deposit paid to owner" defaultChecked={L.depositPaid} />
          <TextInput id="ls-dutr" name="depositUtr" label="Transaction ID (UTR / cheque no.)" defaultValue={L.depositUtr} placeholder="e.g. HDFCN4410028811" upper hint="Of the deposit payment" />
          <SelectInput id="ls-dch" name="depositChannel" label="Payment channel" options={DEP_CHANNELS} defaultValue={L.depositChannel || ''} placeholder="— choose —" />
          <TextInput id="ls-dbk" name="depositBank" label="Bank name" defaultValue={L.depositBank} placeholder="e.g. HDFC Bank" hint="Bank the deposit was paid from" />
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
            <CheckField grid={false} id="ls-tds" name="tds" label="Deduct TDS when rent exceeds ₹50,000/month (10%; 20% if the owner has no valid PAN)" defaultChecked={L.tds} />
            <CheckField grid={false} id="ls-tdm" name="tdsOnMaint" label="Also on maintenance paid to owner" defaultChecked={L.tdsOnMaint} />
          </FieldBox>

          <SectionTitle>7 · Clauses</SectionTitle>
          <TextInput id="ls-cl" name="clauses" label="Key clauses & obligations" multiline full defaultValue={L.clauses || ''} placeholder="Repairs split, signage rights, restoration, subletting…" />
          <Cell full>
            <Box sx={{ borderTop: '1px solid var(--line)', pt: 1.5, mt: 0.5 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Rent schedule preview — yearly</div>
              <div id="ls-prev">{sc && sc.rows.length && +x.rent > 0 ? (
                <Box sx={{ display: 'grid', gap: 1.5 }}>
                  <RentByYear sc={sc} />
                  <SchedTotals sc={sc} L={x} />
                  <TimingNote sc={sc} L={x} />
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
