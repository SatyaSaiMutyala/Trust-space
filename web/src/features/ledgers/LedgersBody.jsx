/* Running ledgers by payment type with reconciliation tables (prototype ledgersBody + reconTable + elecTable + depositTable).
   The ledger lines, balances, reconciliation and deposit rows come from the API (GET /api/ledgers — computed on the server);
   the electricity readings table lists invoice records as stored. */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import TableFooter from '@mui/material/TableFooter'
import { S, UI, prop, owner, isOwner, scopeProps, emit, useStore } from '../../store/store'
import { openInv, obPay } from '../../store/actions'
import { callApi } from '../../app/store'
import { inr, fmtD, perLabel, fy, by, TODAY } from '../../domain/utils'
import { invState, ledTypes, fyStart, leaseOwners } from '../../domain/lease'
import { LED_TABS } from '../../domain/constants'
import { offerDownload } from '../../services/files'
import { Btn, Panel, Kpis, Kpi, TableCard, ClickRow, Stack } from '../../components/ui/Layout'
import { StatusChip, Seg } from '../../components/ui/Status'
import { KpiSkeleton, TableSkeleton, Refreshing } from '../../components/ui/Skeletons'
import { SelectInput } from '../../components/form/Fields'
import { toast } from '../../store/store'
import SrLabel from '../invoices/SrLabel'
import ObMonthTable from '../opening/ObMonthTable'
import { useLedger } from '../shared/useLedgerReports'

const fsx = { width: 'auto', '& .MuiInputBase-root': { fontSize: 14 }, '& select': { py: '7px' } }
const setLed = patch => { UI.led = Object.assign(UI.led || { tab: 'Rent' }, patch); emit() }
/* Tablet widths: dates and chips stay on one line; the table scrolls instead. */
const NW = { whiteSpace: 'nowrap' }

function SectionPanel({ title, sub, actions, children }) {
  return <Panel body={false} title={<h3>{title}</h3>} sub={sub} actions={actions}>{children}</Panel>
}

/** Agreement vs invoices for Rent / Maintenance — rows from the API (ledger.recon). */
function ReconTable({ type, recon }) {
  if (!recon || !recon.rows.length) return null
  return (
    <SectionPanel title={`${type} — agreement vs invoices`} sub={`Each month’s ${type.toLowerCase()} as per the agreement schedule, checked against what was invoiced and paid, from the first invoice recorded in TruSpace.`}
      actions={recon.diff ? <StatusChip label={'Net difference ' + inr(recon.diff)} k="warn" /> : <StatusChip label="Matches agreement" k="ok" />}>
      <TableCard panel={false} maxHeight="60vh">
        <TableHead><TableRow><TableCell>Month</TableCell><TableCell>Premises</TableCell><TableCell className="num">As per agreement</TableCell><TableCell className="num">Invoiced</TableCell><TableCell className="num">Difference</TableCell><TableCell>Due by</TableCell><TableCell>Status</TableCell><TableCell>Paid on</TableCell></TableRow></TableHead>
        <TableBody>
          {recon.rows.map(x => {
            const diff = x.inv ? x.inv.base - x.amt : 0; const st = x.state
            const cells = <>
              <TableCell>{perLabel(x.period)}{x.notes.length ? <div className="small muted">{x.notes.join(' · ')}</div> : null}</TableCell>
              <TableCell className="small">{prop(x.propertyId)?.code || ''}{x.multi && !isOwner() ? <div className="muted">{owner(x.ownerId)?.name || ''}</div> : null}</TableCell>
              <TableCell className="num">{inr(x.amt)}</TableCell>
              <TableCell className="num">{x.inv ? inr(x.inv.base) : '—'}</TableCell>
              <TableCell className="num" style={diff ? { color: 'var(--warn)' } : undefined}>{x.inv ? (diff ? (diff > 0 ? '+' : '−') + inr(Math.abs(diff)) : '✓') : ''}</TableCell>
              <TableCell className="small" sx={NW}>{fmtD(x.due)}</TableCell>
              <TableCell sx={NW}><StatusChip label={st} k={st === 'Not invoiced' ? 'bad' : st === 'Upcoming' ? 'idle' : undefined} /></TableCell>
              <TableCell className="small" sx={NW}>{x.inv?.paidDate ? fmtD(x.inv.paidDate) : ''}</TableCell>
            </>
            const key = x.leaseId + x.period + x.ownerId
            return x.inv ? <ClickRow key={key} onClick={() => openInv(x.inv.id)}>{cells}</ClickRow> : <TableRow key={key}>{cells}</TableRow>
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

/** Deposits & advances — rows from the API (ledger.deposits). */
function DepositTable({ rows }) {
  if (!rows || !rows.length) return null
  return (
    <SectionPanel title="Deposits & advances" sub="One-time amounts held under each agreement.">
      <TableCard panel={false}>
        <TableHead><TableRow><TableCell>Date</TableCell><TableCell>Premises</TableCell><TableCell>Particulars</TableCell><TableCell className="num">Amount</TableCell><TableCell>Status</TableCell><TableCell>Note</TableCell></TableRow></TableHead>
        <TableBody>
          {rows.map((r, ix) => (
            <TableRow key={ix}>
              <TableCell className="small" sx={NW}>{fmtD(r.d)}</TableCell><TableCell className="small">{prop(r.propertyId)?.code || ''}</TableCell><TableCell>{r.t}</TableCell>
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
  const ownerOpts = o ? [] : [...new Set(leases.flatMap(L => leaseOwners(L).map(x => x.ownerId)))]
  if (U.owner && !ownerOpts.includes(U.owner)) U.owner = ''
  const fyF = U.fy || 'all'
  const params = { tab: U.tab, propertyId: fixedPid || U.prop || '', ownerId: o ? '' : (U.owner || ''), fy: fyF }
  const { ledger: D, isFetching } = useLedger(params)
  const fys = D ? D.fys : [fy(TODAY)]
  const from = fyF === 'all' ? '0000' : fyStart(fyF), to = fyF === 'all' ? '9999' : fyStart(String(+fyF.slice(0, 2) + 1).padStart(2, '0') + '-')
  const csv = async () => { try { offerDownload(`TruSpace-${U.tab.toLowerCase()}-ledger-${TODAY}.csv`, await callApi('ledgerCsv', { tab: params.tab, propertyId: params.propertyId, ownerId: params.ownerId })) } catch (e) { toast(e.message, 'error') } }
  const filters = (
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
  )
  if (!D) return <Stack>{filters}<KpiSkeleton count={5} /><TableSkeleton rows={8} cols={5} /></Stack>
  const { opening, rows, totals: T } = D; let bal = opening
  const tabInv = S.invoices.filter(i => pids.has(i.propertyId) && i.status !== 'Rejected' && (!params.ownerId || i.ownerId === params.ownerId) && ledTypes(U.tab).includes(i.type))
  return (
    <Stack>
      {filters}
      <Refreshing on={isFetching}>
        <Kpis>
          <Kpi label="Opening balance" value={inr(opening)} sub={fyF === 'all' ? 'From first entry' : 'As on 1 Apr 20' + fyF.slice(0, 2)} />
          <Kpi label="Invoiced" value={inr(T.dr)} sub={`${T.invoices} invoices`} />
          <Kpi label="Received" value={inr(T.cr - T.tds)} sub="Bank transfers" />
          <Kpi label="TDS deducted" value={inr(T.tds)} sub="Credited to owner’s PAN" />
          <Kpi label={o ? 'Due to you' : 'Payable to owner'} value={inr(T.closing)} sub="Closing balance" alert={T.closing > 0} />
        </Kpis>
      </Refreshing>
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
              : x.ob && !o ? <ClickRow key={ix} onClick={() => obPay(x.ob.lease, x.ob.item)}>{cells}</ClickRow>
              : <TableRow key={ix}>{cells}</TableRow>
          }) : <TableRow><TableCell colSpan={5} className="empty">No {U.tab.toLowerCase()} entries in this period.</TableCell></TableRow>}
        </TableBody>
        <TableFooter sx={{ '& td': { color: 'var(--ink)', fontSize: 13.5 } }}><TableRow className="yr"><TableCell /><TableCell><b>Closing balance</b></TableCell><TableCell className="num"><b>{inr(T.dr)}</b></TableCell><TableCell className="num"><b>{inr(T.cr)}</b></TableCell><TableCell className="num"><b>{inr(T.closing)}</b></TableCell></TableRow></TableFooter>
      </TableCard>
      <ObMonthTable leases={leases} types={ledTypes(U.tab)} ownerId={params.ownerId || (o ? D.ownerId : null)} compact={!!fixedPid} />
      {U.tab === 'Rent' || U.tab === 'Maintenance' ? <ReconTable type={U.tab} recon={D.recon} /> : null}
      {U.tab === 'Electricity' ? <ElecTable invs={tabInv.filter(i => i.date >= from && i.date < to)} /> : null}
      {U.tab === 'Other' ? <DepositTable rows={D.deposits} /> : null}
    </Stack>
  )
}
