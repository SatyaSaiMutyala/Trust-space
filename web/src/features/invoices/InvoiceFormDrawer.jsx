/* Generate / upload / record an owner invoice (prototype DRAWERS.invoice + calcBox + P_meter + SUBMIT.invoice). */
import { useRef, useState } from 'react'
import { S, ALL, isOwner, role, prop, owner, scopeProps, closeDrawer, useStore } from '../../store/store'
import { inr, fy, perLabel, TODAY, CUR, pctLabel } from '../../domain/utils'
import { leaseOf, schedRow, rentFor, calc, leaseOwners, isMulti, ownerShare, TDS_BASE, TDS_NOPAN } from '../../domain/lease'
import { INV_TYPES } from '../../domain/constants'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn, Banner } from '../../components/ui/Layout'
import { FormGrid, Cell, SectionTitle, FieldBox, TextInput, SelectInput, CheckField } from '../../components/form/Fields'
import { submitInvoice } from './actions'

/** Live amount / GST / TDS / net breakdown (prototype calcBox). */
export function CalcBox({ c, L }) {
  return (
    <div className="calc">
      <div><span>Amount</span><span className="mono">{inr(c.base)}</span></div>
      <div><span>GST 18%{(c.mode || L?.gstMode) === 'RCM' ? ' (paid by TrustLab under RCM, not on invoice)' : ''}</span><span className="mono">{inr(c.gst)}</span></div>
      <div><span>Invoice total</span><span className="mono">{inr(c.total)}</span></div>
      <div><span>Less TDS {c.tds ? (c.tdsRate || 10) + '%' : ''} deducted by TrustLab{c.tds ? (c.tdsRate === TDS_NOPAN ? ' (no valid PAN)' : c.tdsRate !== TDS_BASE ? ' (lower-deduction certificate)' : '') : ' — not applicable'}</span><span className="mono">−{inr(c.tds)}</span></div>
      <div className="big"><span>Net payable to owner</span><span className="mono">{inr(c.net)}</span></div>
      {c.rcm ? <div className="small muted"><span>TrustLab GST liability under RCM</span><span className="mono">{inr(c.rcm)}</span></div> : null}
    </div>
  )
}

/** "· meter <no.>" after the meter-reading heading (prototype P_meter). */
function PMeter({ pid }) { const P = prop(pid); return P?.meter ? <>· meter <span className="mono">{P.meter}</span></> : null }

export default function InvoiceFormDrawer({ d }) {
  useStore()
  // The prototype re-opened the drawer with these params whenever property, type, mode, co-owner or (for rent) month changed.
  const [p, setP] = useState(() => ({ prop: d.prop, lease: d.lease, type: d.type, period: d.period, mode: d.mode, owner: d.owner, number: d.number, base: d.base, gst: d.gst, gen: 0 }))
  const [busy, setBusy] = useState(false)
  const formRef = useRef(null)
  const dup = useRef({ ok: false })

  const o = isOwner()
  const props = scopeProps().filter(x => leaseOf(x.id))
  const pid = p.prop || (p.lease ? S.leases.find(l => l.id === p.lease)?.propertyId : '') || props[0]?.id || ''
  const mode = p.mode || 'generate'; const type = p.type || 'Rent'; const period = p.period || CUR
  const L = leaseOf(pid); const oid = isOwner() ? role().ownerId : (p.owner && leaseOwners(L, p.period || CUR).some(o => o.ownerId === p.owner) ? p.owner : leaseOwners(L, p.period || CUR)[0]?.ownerId || L?.ownerId); const O = owner(oid)
  const seq = ALL.invoices.filter(i => i.ownerId === O?.id && fy(i.date) === fy(TODAY)).length + 1
  const number = p.number ?? (O ? `${O.invPrefix || 'INV'}/${fy(TODAY)}/${String(seq).padStart(3, '0')}` : '')
  let base = p.base
  const rS = L ? schedRow(L, period)?.split?.find(x => x.ownerId === oid) : null
  if (base === undefined) { base = type === 'Rent' ? (rS ? rS.rent - rS.adj : rentFor(L, period) * ownerShare(L, oid, 'rent')) : type === 'Maintenance' ? (rS ? rS.maint : (L?.maint || 0) * ownerShare(L, oid, 'maint')) : 0; base = Math.round(base) }
  const c0 = calc(L, type, base, period, p.gst, oid)
  const R = d.reading || {}
  const sr = schedRow(L, period)

  const [live, setLive] = useState(null) // {gen, c, units}
  const c = live && live.gen === p.gen ? live.c : c0
  const units = live && live.gen === p.gen && live.units != null ? live.units : (R.close ? (R.close - R.open).toLocaleString('en-IN') + ' kWh' : '0 kWh')

  const q = id => formRef.current?.querySelector('#' + id)
  const onInput = e => {
    const f = formRef.current; if (!f) return
    const t = e.target; const fd = new FormData(f); let u = null
    if (['iv-open', 'iv-close', 'iv-rate', 'iv-fixed'].includes(t.id)) { const n = Math.max(0, (+fd.get('rclose') || 0) - (+fd.get('ropen') || 0)); q('iv-base').value = Math.round(n * (+fd.get('rrate') || 0) + (+fd.get('rfixed') || 0)); u = n.toLocaleString('en-IN') + ' kWh' }
    const gb = q('iv-gst')
    const cc = calc(L, fd.get('type'), q('iv-base').value, fd.get('period'), gb ? gb.checked : undefined, oid)
    setLive(v => ({ gen: p.gen, c: cc, units: u ?? (v && v.gen === p.gen ? v.units : null) }))
  }
  const onChange = e => {
    const id = e.target.id; const f = formRef.current
    if (['iv-prop', 'iv-type', 'iv-mode', 'iv-own'].includes(id) || (id === 'iv-per' && new FormData(f).get('type') === 'Rent')) {
      const fd = new FormData(f)
      setP(o => ({ prop: fd.get('propertyId'), lease: o.lease, type: fd.get('type'), period: fd.get('period'), mode: fd.get('mode'), owner: id === 'iv-prop' ? undefined : (fd.get('ownerId') || o.owner), base: undefined, gst: undefined, number: ['iv-prop', 'iv-own'].includes(id) ? undefined : (fd.get('number') || undefined), gen: o.gen + 1 }))
      setLive(null); dup.current = { ok: false }
    } else onInput(e)
  }
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return
    const f = e.currentTarget; const gb = q('iv-gst')
    setBusy(true)
    try { await submitInvoice(new FormData(f), { gst: gb ? gb.checked && !gb.disabled : undefined, dup: dup.current, id: d.id }) } finally { setBusy(false) }
  }

  return (
    <DrawerLayout
      title={d.id ? `Edit invoice ${d.number}` : o ? (mode === 'upload' ? 'Upload invoice' : 'Generate invoice') : 'Record owner invoice'}
      sub={d.id ? 'Amounts, GST and TDS are recalculated from the lease when you save. The workflow status is kept.' : o ? 'Addressed to TrustLab Diagnostics Private Limited. TDS and GST follow your lease.' : 'Enter an invoice received from the owner, or raise one on their behalf.'}
      footer={props.length ? <><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-inv" disabled={busy}>{d.id ? 'Save changes' : 'Submit invoice'}</Btn></> : null}>
      {props.length ? (
        <form id="f-inv" ref={formRef} key={p.gen} onSubmit={onSubmit} onInput={onInput} onChange={onChange} noValidate={false}>
          <FormGrid>
            <SelectInput id="iv-mode" name="mode" label="How" defaultValue={mode} options={[['generate', 'Generate in TruSpace'], ['upload', 'Upload my own invoice']]} />
            <SelectInput id="iv-prop" name="propertyId" label="Property" defaultValue={pid} options={props.map(x => [x.id, `${x.name} (${x.code})`])} />
            {!o && isMulti(L)
              ? <SelectInput id="iv-own" name="ownerId" label="Invoice from (co-owner)" full defaultValue={oid} options={leaseOwners(L, period).map(x => [x.ownerId, `${owner(x.ownerId)?.name || '—'} · rent ${pctLabel(x.rent)}`])} hint="Each co-owner raises their own invoice for their share" />
              : o && isMulti(L) ? <Cell full><Banner>You own {pctLabel(ownerShare(L, oid, 'rent') * 100)} of the rent and {pctLabel(ownerShare(L, oid, 'maint') * 100)} of maintenance. Invoice your share only.</Banner></Cell> : null}
            <SelectInput id="iv-type" name="type" label="Invoice for" defaultValue={type} options={INV_TYPES} />
            <TextInput id="iv-per" name="period" label="Billing month" type="month" defaultValue={period} required />
            <TextInput id="iv-no" name="number" label="Invoice number" defaultValue={number} required />
            <TextInput id="iv-date" name="date" label="Invoice date" type="date" defaultValue={d.date || TODAY} required />
            {type === 'Electricity' ? <>
              <SectionTitle>Meter reading <PMeter pid={pid} /></SectionTitle>
              <TextInput id="iv-open" name="ropen" label="Opening reading (kWh)" type="number" defaultValue={R.open} min="0" />
              <TextInput id="iv-close" name="rclose" label="Closing reading (kWh)" type="number" defaultValue={R.close} min="0" hint={<span id="iv-units">{units}</span>} />
              <TextInput id="iv-rate" name="rrate" label="Rate per unit (₹)" type="number" defaultValue={R.rate ?? 9.35} step="0.01" min="0" />
              <TextInput id="iv-fixed" name="rfixed" label="Fixed / demand charges (₹)" type="number" defaultValue={R.fixed ?? 0} min="0" />
            </> : null}
            <TextInput id="iv-base" name="base" type="number" required min="0" defaultValue={base}
              label={type === 'Rent' ? `Rent amount (₹) — ${isMulti(L) ? 'share as per schedule' : 'schedule'} ${inr(rS ? rS.rent - rS.adj : (sr?.rent || 0) - (sr?.adj || 0))}${sr?.notes.length ? ' · ' + sr.notes.join(', ') : ''}` : 'Amount before GST (₹)'} />
            {type !== 'Rent' || c0.mode !== 'RCM'
              ? <CheckField full={false} id="iv-gst" name="gst" defaultChecked={!!c0.gst} disabled={c0.mode === 'RCM' || !O?.gstin} label={`Charge GST 18% ${!O?.gstin ? '(no GSTIN on file)' : ''}`} />
              : <Cell />}
            <TextInput id="iv-desc" name="desc" label="Description" full defaultValue={d.desc ?? (type === 'Rent' ? `Rent for ${prop(pid)?.name} for ${perLabel(period)}` : type === 'Maintenance' ? 'Common area maintenance' : '')} />
            <FieldBox id="iv-files" full label={mode === 'upload' ? 'Invoice copy (PDF or photo) — required' : 'Supporting documents (DISCOM bill, receipts)'}>
              <input type="file" id="iv-files" name="files" multiple accept="application/pdf,image/*" required={mode === 'upload' && !d.id} style={{ maxWidth: '100%' }} />
            </FieldBox>
            <Cell full id="iv-calc"><CalcBox c={c} L={L} /></Cell>
          </FormGrid>
        </form>
      ) : <div className="empty">No property with a lease is available.</div>}
    </DrawerLayout>
  )
}
