/* Running ledgers by payment type with reconciliation tables (prototype ledgersBody + reconTable + elecTable + depositTable). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import TableFooter from '@mui/material/TableFooter'
import { S, UI, prop, owner, role, isOwner, scopeProps, emit, useStore } from '../../store/store'
import { openInv, obPay } from '../../store/actions'
import { inr, fmtD, perLabel, fy, by, TODAY, CUR, pctLabel } from '../../domain/utils'
import { schedule, invState, ledTypes, fyStart, fyList, ledgerEntries, ledgerCsv, leaseOwners, isMulti, splitAmt, depAdjs, depHeld, openingEntries, depAdjEntries, obMe } from '../../domain/lease'
import { LED_TABS } from '../../domain/constants'
import { offerDownload } from '../../services/files'
import { Btn, Panel, Kpis, Kpi, TableCard, ClickRow, Stack } from '../../components/ui/Layout'
import { StatusChip, Seg } from '../../components/ui/Status'
import { SelectInput } from '../../components/form/Fields'
import SrLabel from '../invoices/SrLabel'
import ObMonthTable from '../opening/ObMonthTable'

const fsx = { width: 'auto', '& .MuiInputBase-root': { fontSize: 14 }, '& select': { py: '7px' } }
const setLed = patch => { UI.led = Object.assign(UI.led || { tab: 'Rent' }, patch); emit() }
/* Tablet widths: dates and chips stay on one line; the table scrolls instead. */
const NW = { whiteSpace: 'nowrap' }

function SectionPanel({ title, sub, actions, children }) {
  return <Panel body={false} title={<h3>{title}</h3>} sub={sub} actions={actions}>{children}</Panel>
}

function ReconTable({ leases, type, from, to }) {
  const rows = []
  const me = isOwner() ? role().ownerId : null; const fo = UI.led?.owner || ''
  leases.forEach(L => {
    const first = S.invoices.filter(i => i.leaseId === L.id && i.type === type).map(i => i.period).sort()[0] || CUR
    schedule(L).rows.forEach(r => {
      if (r.p > CUR || r.p < first) return; if (from !== '0000' && r.p < from.slice(0, 7)) return; if (to !== '9999' && r.p >= to.slice(0, 7)) return
      r.split.forEach(x => {
        if (me && x.ownerId !== me) return; if (fo && x.ownerId !== fo) return; const amt = type === 'Rent' ? x.rent - x.adj : x.maint; if (!amt) return
        const inv = S.invoices.find(i => i.leaseId === L.id && i.type === type && i.period === r.p && i.status !== 'Rejected' && (i.ownerId || L.ownerId) === x.ownerId)
        rows.push({ L, r, amt, inv, ownerId: x.ownerId, multi: isMulti(L) })
      })
    })
  })
  if (!rows.length) return null
  rows.sort((a, b) => b.r.p.localeCompare(a.r.p))
  const diffT = rows.reduce((a, x) => a + (x.inv ? x.inv.base - x.amt : 0), 0)
  return (
    <SectionPanel title={`${type} — agreement vs invoices`} sub={`Each month’s ${type.toLowerCase()} as per the agreement schedule, checked against what was invoiced and paid, from the first invoice recorded in TruSpace.`}
      actions={diffT ? <StatusChip label={'Net difference ' + inr(diffT)} k="warn" /> : <StatusChip label="Matches agreement" k="ok" />}>
      <TableCard panel={false} maxHeight="60vh">
        <TableHead><TableRow><TableCell>Month</TableCell><TableCell>Premises</TableCell><TableCell className="num">As per agreement</TableCell><TableCell className="num">Invoiced</TableCell><TableCell className="num">Difference</TableCell><TableCell>Due by</TableCell><TableCell>Status</TableCell><TableCell>Paid on</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.map(({ L, r, amt, inv, ownerId, multi }) => {
            const diff = inv ? inv.base - amt : 0
            const st = inv ? invState(inv) : (r.due < TODAY ? 'Not invoiced' : 'Upcoming')
            const cells = <>
              <TableCell>{perLabel(r.p)}{r.notes.length ? <div className="small muted">{r.notes.join(' · ')}</div> : null}</TableCell>
              <TableCell className="small">{prop(L.propertyId)?.code || ''}{multi && !isOwner() ? <div className="muted">{owner(ownerId)?.name || ''}</div> : null}</TableCell>
              <TableCell className="num">{inr(amt)}</TableCell>
              <TableCell className="num">{inv ? inr(inv.base) : '—'}</TableCell>
              <TableCell className="num" style={diff ? { color: 'var(--warn)' } : undefined}>{inv ? (diff ? (diff > 0 ? '+' : '−') + inr(Math.abs(diff)) : '✓') : ''}</TableCell>
              <TableCell className="small" sx={NW}>{fmtD(r.due)}</TableCell>
              <TableCell sx={NW}><StatusChip label={st} k={st === 'Not invoiced' ? 'bad' : st === 'Upcoming' ? 'idle' : undefined} /></TableCell>
              <TableCell className="small" sx={NW}>{inv?.paidDate ? fmtD(inv.paidDate) : ''}</TableCell>
            </>
            return inv ? <ClickRow key={L.id + r.p + ownerId} onClick={() => openInv(inv.id)}>{cells}</ClickRow> : <TableRow key={L.id + r.p + ownerId}>{cells}</TableRow>
          })}
        </TableBody>
      </TableCard>
    </SectionPanel>
  )
}

function ElecTable({ invs }) {
  if (!invs.length) return null
  return (
    <SectionPanel title="Electricity consumption" sub="Meter readings behind each electricity invoice.">
      <TableCard panel={false}>
        <TableHead><TableRow><TableCell>Month</TableCell><TableCell>Premises / meter</TableCell><TableCell className="num">Opening</TableCell><TableCell className="num">Closing</TableCell><TableCell className="num">Units (kWh)</TableCell><TableCell className="num">Rate</TableCell><TableCell className="num">Fixed</TableCell><TableCell className="num">Amount</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
        <TableBody>
          {invs.sort(by('period', -1)).map(i => {
            const r = i.reading || {}; const u = r.close != null && r.open != null ? r.close - r.open : null
            return (
              <ClickRow key={i.id} onClick={() => openInv(i.id)}>
                <TableCell sx={NW}>{perLabel(i.period)}</TableCell>
                <TableCell className="small">{prop(i.propertyId)?.code || ''}<div className="code">{prop(i.propertyId)?.meter || ''}</div></TableCell>
                <TableCell className="num">{r.open != null ? (+r.open).toLocaleString('en-IN') : '—'}</TableCell>
                <TableCell className="num">{r.close != null ? (+r.close).toLocaleString('en-IN') : '—'}</TableCell>
                <TableCell className="num">{u != null ? u.toLocaleString('en-IN') : '—'}</TableCell>
                <TableCell className="num">{r.rate ? '₹' + r.rate : '—'}</TableCell>
                <TableCell className="num">{r.fixed ? inr(r.fixed) : '—'}</TableCell>
                <TableCell className="num">{inr(i.total)}</TableCell>
                <TableCell sx={NW}><StatusChip label={invState(i)} /></TableCell>
              </ClickRow>
            )
          })}
        </TableBody>
      </TableCard>
    </SectionPanel>
  )
}

function DepositTable({ leases }) {
  if (!leases.length) return null
  const rows = []
  const me = isOwner() ? role().ownerId : null; const fo = UI.led?.owner || ''
  leases.forEach(L => {
    const P = prop(L.propertyId); const sc = schedule(L); const x = L.exit || {}; const multi = isMulti(L); const ded = (x.deductions || []).reduce((a, dd) => a + (+dd.amount || 0), 0); const dedSplit = splitAmt(ded, leaseOwners(L), 'dep')
    ;(sc.owners || []).forEach((o, i) => {
      if (me && o.ownerId !== me) return; if (fo && o.ownerId !== fo) return; const who = multi && !me ? ` — ${owner(o.ownerId)?.name || ''} (${pctLabel(o.share.dep)})` : ''
      if (o.deposit) rows.push({ d: L.start, p: P, t: 'Security deposit received from TrustLab' + who, a: o.deposit, s: L.depositPaid ? 'Received' : 'Pending', n: 'Refundable at the end of the lease' })
      depAdjs(L, o.ownerId, true).forEach(a => rows.push({ d: a.period + '-01', p: P, t: `Security deposit adjusted against rent for ${perLabel(a.period)}` + who, a: -(+a.amount || 0), s: a.status === 'Agreed' ? 'Adjusted' : 'Proposed', n: a.status === 'Agreed' ? `Agreed ${fmtD(a.consent?.on)}${a.consent?.ref ? ' · ' + a.consent.ref : ''}` : 'Awaiting owner’s agreement' }))
      if (depAdjs(L, o.ownerId).length) rows.push({ d: TODAY, p: P, t: 'Security deposit still held' + who, a: depHeld(L, o.ownerId), s: 'Held', n: 'After rent adjustments' })
      if (o.adv) rows.push({ d: L.start, p: P, t: 'Advance rent received' + who, a: o.adv, s: 'Received', n: `Adjusted against rent over ${L.advanceMonths || 1} month(s) · ${inr(o.adj)} adjusted in the schedule` })
      if (x.stage >= 4) { const rf = (x.refunds || []).find(rr => rr.ownerId === o.ownerId); rows.push({ d: (rf && rf.date) || x.refundDate || x.effective, p: P, t: 'Deposit refund to TrustLab' + who, a: -(rf ? rf.amount : multi ? depHeld(L, o.ownerId) - dedSplit[i] : (x.refundReceived || x.refund || 0)), s: x.stage >= 5 ? 'Refunded' : 'Agreed', n: dedSplit[i] ? 'After deductions of ' + inr(dedSplit[i]) : 'No deductions' }) }
    })
  })
  return (
    <SectionPanel title="Deposits & advances" sub="One-time amounts held under each agreement.">
      <TableCard panel={false}>
        <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Premises</TableCell><TableCell>Particulars</TableCell><TableCell className="num">Amount</TableCell><TableCell>Status</TableCell><TableCell>Note</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.map((r, ix) => (
            <TableRow key={ix}>
              <TableCell className="small" sx={NW}>{fmtD(r.d)}</TableCell><TableCell className="small">{r.p?.code || ''}</TableCell><TableCell>{r.t}</TableCell>
              <TableCell className="num">{r.a < 0 ? '−' : ''}{inr(Math.abs(r.a))}</TableCell>
              <TableCell sx={NW}><StatusChip label={r.s} k={['Pending', 'Proposed'].includes(r.s) ? 'warn' : r.s === 'Held' ? 'info' : 'ok'} /></TableCell>
              <TableCell className="small muted" sx={{ minWidth: 200 }}>{r.n}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </TableCard>
    </SectionPanel>
  )
}

export default function LedgersBody({ fixedPid }) {
  useStore()
  const o = isOwner(); const U = UI.led = UI.led || { tab: 'Rent', prop: '', fy: fy(TODAY) }
  const props = fixedPid ? [prop(fixedPid)] : scopeProps(); const pids = new Set((U.prop && !fixedPid ? [U.prop] : props.map(p => p.id)))
  const leases = S.leases.filter(l => pids.has(l.propertyId) && l.status !== 'Draft')
  const ownerOpts = isOwner() ? [] : [...new Set(leases.flatMap(L => leaseOwners(L).map(x => x.ownerId)))]
  if (U.owner && !ownerOpts.includes(U.owner)) U.owner = ''
  const all = S.invoices.filter(i => pids.has(i.propertyId) && i.status !== 'Rejected' && (!U.owner || i.ownerId === U.owner))
  const tabInv = all.filter(i => ledTypes(U.tab).includes(i.type))
  const fys = fyList(all); const fyF = U.fy || 'all'
  const from = fyF === 'all' ? '0000' : fyStart(fyF), to = fyF === 'all' ? '9999' : fyStart(String(+fyF.slice(0, 2) + 1).padStart(2, '0') + '-')
  const ent = ledgerEntries(tabInv).concat(openingEntries(leases, ledTypes(U.tab), obMe() || U.owner || null), U.tab === 'Rent' ? depAdjEntries(leases, obMe() || U.owner || null) : []).sort((a, b) => a.d.localeCompare(b.d) || a.o - b.o)
  const opening = ent.filter(x => x.d < from).reduce((a, x) => a + x.dr - x.cr, 0); let bal = opening
  const rows = ent.filter(x => x.d >= from && x.d < to)
  const sum = k => rows.reduce((a, x) => a + x[k], 0)
  const tds = rows.filter(x => x.part.startsWith('TDS')).reduce((a, x) => a + x.cr, 0)
  const closing = opening + sum('dr') - sum('cr')
  const csv = () => offerDownload(`TruSpace-${U.tab.toLowerCase()}-ledger-${TODAY}.csv`, ledgerCsv(fixedPid || '', U, scopeProps().map(p => p.id)))
  return (
    <Stack>
      <div className="filters" style={{ justifyContent: 'space-between' }}>
        <Seg role="tablist" itemRole="tab" ariaLabel="Ledger" options={LED_TABS} value={U.tab} onChange={t => setLed({ tab: t })} />
        <div className="filters">
          {fixedPid || props.length < 2 ? null : <><SrLabel htmlFor="ledProp">Property</SrLabel><SelectInput grid={false} sx={{ ...fsx, minWidth: 180 }} id="ledProp" value={U.prop || ''} onChange={e => setLed({ prop: e.target.value, owner: '' })} options={[['', 'All properties'], ...props.map(p => [p.id, p.name])]} /></>}
          {ownerOpts.length > 1 ? <><SrLabel htmlFor="ledOwner">Owner</SrLabel><SelectInput grid={false} sx={{ ...fsx, minWidth: 160 }} id="ledOwner" value={U.owner || ''} onChange={e => setLed({ owner: e.target.value })} options={[['', 'All owners'], ...ownerOpts.map(id => [id, owner(id)?.name || id])]} /></> : null}
          <SrLabel htmlFor="ledFy">Financial year</SrLabel>
          <SelectInput grid={false} sx={{ ...fsx, minWidth: 120 }} id="ledFy" value={fyF} onChange={e => setLed({ fy: e.target.value })} options={[['all', 'All years'], ...fys.map(f => [f, `FY 20${f}`])]} />
          <Btn sm onClick={csv}>Download (CSV)</Btn>
        </div>
      </div>
      <Kpis>
        <Kpi label="Opening balance" value={inr(opening)} sub={fyF === 'all' ? 'From first entry' : 'As on 1 Apr 20' + fyF.slice(0, 2)} />
        <Kpi label="Invoiced" value={inr(sum('dr'))} sub={`${rows.filter(x => x.dr).length} invoices`} />
        <Kpi label="Received" value={inr(sum('cr') - tds)} sub="Bank transfers" />
        <Kpi label="TDS deducted" value={inr(tds)} sub="Credited to owner’s PAN" />
        <Kpi label={o ? 'Due to you' : 'Payable to owner'} value={inr(closing)} sub="Closing balance" alert={closing > 0} />
      </Kpis>
      <TableCard className="ledger">
        <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Particulars</TableCell><TableCell className="num">Invoiced (Dr)</TableCell><TableCell className="num">Paid / TDS (Cr)</TableCell><TableCell className="num">Balance</TableCell></TableRow></TableHead>
        <TableBody>
          <TableRow className="yr"><TableCell sx={NW}>{fyF === 'all' ? '' : fmtD(from)}</TableCell><TableCell><b>Opening balance</b></TableCell><TableCell /><TableCell /><TableCell className="num"><b>{inr(opening)}</b></TableCell></TableRow>
          {rows.length ? rows.map((x, ix) => {
            bal += x.dr - x.cr
            const cells = <>
              <TableCell className="small" sx={NW}>{fmtD(x.d)}</TableCell>
              <TableCell>{x.part}<div className="small muted">{x.sub}</div></TableCell>
              <TableCell className="num">{x.dr ? inr(x.dr) : ''}</TableCell>
              <TableCell className="num">{x.cr ? inr(x.cr) : ''}</TableCell>
              <TableCell className="num">{inr(bal)}</TableCell>
            </>
            return x.inv ? <ClickRow key={ix} onClick={() => openInv(x.inv)}>{cells}</ClickRow>
              : x.ob && !isOwner() ? <ClickRow key={ix} onClick={() => obPay(x.ob.lease, x.ob.item)}>{cells}</ClickRow>
              : <TableRow key={ix}>{cells}</TableRow>
          }) : <TableRow><TableCell colSpan={5} className="empty">No {U.tab.toLowerCase()} entries in this period.</TableCell></TableRow>}
        </TableBody>
        <TableFooter sx={{ '& td': { color: 'var(--ink)', fontSize: 13.5 } }}><TableRow className="yr"><TableCell /><TableCell><b>Closing balance</b></TableCell><TableCell className="num"><b>{inr(sum('dr'))}</b></TableCell><TableCell className="num"><b>{inr(sum('cr'))}</b></TableCell><TableCell className="num"><b>{inr(closing)}</b></TableCell></TableRow></TableFooter>
      </TableCard>
      <ObMonthTable leases={leases} types={ledTypes(U.tab)} ownerId={obMe() || U.owner || null} compact={!!fixedPid} />
      {U.tab === 'Rent' || U.tab === 'Maintenance' ? <ReconTable leases={leases} type={U.tab} from={from} to={to} /> : null}
      {U.tab === 'Electricity' ? <ElecTable invs={tabInv.filter(i => i.date >= from && i.date < to)} /> : null}
      {U.tab === 'Other' ? <DepositTable leases={leases} /> : null}
    </Stack>
  )
}
