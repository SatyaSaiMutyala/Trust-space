/* TDS (prototype viewTds): monthly register, challans, returns & Form 16A, owner certificates & PAN. */
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableFooter from '@mui/material/TableFooter'
import TableCell from '../invoices/TableCell'
import { Fragment } from 'react'
import { S, isOwner, useStore } from '../../store/store'
import { TODAY, CUR, inr, fmtD, perLabel, fy, by, daysTo } from '../../domain/utils'
import { leaseOwners, panValid, tdsRate } from '../../domain/lease'
import { tdsDocs, tdsDue, daysBetween, fmtCinDate, TST, tdsEntries, tdsMonthRows, tdsQuarters } from '../../domain/tds'
import { PageHead, Kpis, Kpi, Panel, Banner, Btn, TableCard, ClickRow, Stack } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { FileLinks } from '../../components/ui/Media'
import { SelectInput } from '../../components/form/Fields'
import { SampleBanner } from '../../components/app/Banners'
import SrLabel from '../invoices/SrLabel'
import { tdsv, tdsTab, setTdsFy, tdsMonth, tdsChallan, tdsReturn, tds16, tdsCert, tdsQcsv } from './actions'

const TABS = [['register', 'Monthly register'], ['challans', 'Challans'], ['returns', 'Returns & Form 16A'], ['certs', 'Owner certificates & PAN']]
const NW = { whiteSpace: 'nowrap' }
const fsx = { width: 'auto', minWidth: 120, '& .MuiInputBase-root': { fontSize: 14 }, '& select': { py: '7px' } }
/* Prototype .kv (key/value list) — not in the global stylesheet. */
const KV = { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px', fontSize: 13, m: 0, '& dt': { color: 'var(--muted)' }, '& dd': { m: 0, textAlign: 'right', fontVariantNumeric: 'tabular-nums' } }
const foot = { '& td': { color: 'var(--ink)', fontSize: 13.5 } }

function Register({ rows, f, ded, dep }) {
  const o = isOwner()
  return (
    <>
      <TableCard>
        <TableHead><TableRow><TableCell>Month of deduction</TableCell><TableCell className="num">TDS deducted</TableCell><TableCell className="num">Deposited</TableCell><TableCell className="num">Balance</TableCell><TableCell>Due by</TableCell><TableCell>Status</TableCell><TableCell className="num">Interest (1.5%/mo)</TableCell><TableCell>Challans</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {rows.filter(r => r.ded || r.dep || r.m <= CUR).map(r => (
            <ClickRow key={r.m} onClick={() => tdsMonth(r.m)}>
              <TableCell sx={NW}><b>{perLabel(r.m)}</b><div className="small muted">{r.es.length} deduction{r.es.length === 1 ? '' : 's'} · {new Set(r.es.map(x => x.ownerId)).size} owner(s)</div></TableCell>
              <TableCell className="num">{inr(r.ded)}</TableCell>
              <TableCell className="num">{r.dep ? inr(r.dep) : '—'}</TableCell>
              <TableCell className="num">{r.bal ? <b style={r.bal > 0 ? { color: 'var(--bad)' } : undefined}>{inr(r.bal)}</b> : '—'}</TableCell>
              <TableCell className="small" sx={NW}>{fmtD(r.due)}</TableCell>
              <TableCell sx={NW}><StatusChip label={r.st} k={TST[r.st]} /></TableCell>
              <TableCell className="num">{r.late ? inr(r.late) : '—'}</TableCell>
              <TableCell className="small">{r.cs.length ? r.cs.map((c, i) => <Fragment key={c.id || i}>{i ? <br /> : null}{c.bsr}/{c.challanNo} · {fmtD(c.paidOn)}</Fragment>) : '—'}</TableCell>
              <TableCell>{r.bal > 0 && !o ? <Btn sm primary onClick={e => { e.stopPropagation(); tdsChallan(r.m) }}>Record challan</Btn> : null}</TableCell>
            </ClickRow>
          ))}
        </TableBody>
        <TableFooter sx={foot}><TableRow className="yr"><TableCell><b>FY {f}</b></TableCell><TableCell className="num"><b>{inr(ded)}</b></TableCell><TableCell className="num"><b>{inr(dep)}</b></TableCell><TableCell className="num"><b>{inr(ded - dep)}</b></TableCell><TableCell colSpan={5} /></TableRow></TableFooter>
      </TableCard>
      <p className="small muted" style={{ margin: 0 }}>TDS is due by the 7th of the following month (30 April for March deductions). Late deposit attracts interest at 1.5% per month or part month from the date of deduction; the figure shown is from the due date as a guide — confirm the exact amount with your CA.</p>
    </>
  )
}

function Challans({ f }) {
  const cs = tdsDocs('challan').filter(c => fy(c.month + '-01') === f).sort(by('paidOn', -1))
  return (
    <>
      <div className="filters" style={{ justifyContent: 'flex-end' }}><Btn primary onClick={() => tdsChallan()}>Record challan</Btn></div>
      <TableCard>
        <TableHead><TableRow><TableCell>Paid on</TableCell><TableCell>For month</TableCell><TableCell className="num">Amount</TableCell><TableCell>BSR code</TableCell><TableCell>Challan no.</TableCell><TableCell>CIN</TableCell><TableCell>Mode</TableCell><TableCell>Receipt</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {cs.map(c => (
            <TableRow key={c.id}>
              <TableCell sx={NW}>{fmtD(c.paidOn)}{c.paidOn > tdsDue(c.month) ? <div className="small" style={{ color: 'var(--warn)' }}>{daysBetween(tdsDue(c.month), c.paidOn)} days late</div> : null}</TableCell>
              <TableCell sx={NW}>{perLabel(c.month)}</TableCell>
              <TableCell className="num">{inr(c.amount)}</TableCell>
              <TableCell className="mono">{c.bsr}</TableCell>
              <TableCell className="mono">{c.challanNo}</TableCell>
              <TableCell className="mono small">{c.bsr + fmtCinDate(c.paidOn) + c.challanNo}</TableCell>
              <TableCell className="small">{c.mode || ''}</TableCell>
              <TableCell>{c.file ? <FileLinks files={[c.file]} /> : <span className="muted small">—</span>}</TableCell>
              <TableCell><Btn sm ghost onClick={() => tdsChallan(undefined, c.id)}>Edit</Btn></TableCell>
            </TableRow>
          ))}
          {cs.length ? null : <TableRow><TableCell colSpan={9} className="empty">No challans recorded for this year.</TableCell></TableRow>}
        </TableBody>
      </TableCard>
    </>
  )
}

function Returns({ qs }) {
  return (
    <>
      <div className="qgrid">
        {qs.map(q => (
          <Panel key={q.q} title={<h3>Q{q.q} · {q.ms.map(r => perLabel(r.m)).join(', ')}</h3>} sub={`Return due ${fmtD(q.due)} · Form 16A due ${fmtD(q.f16)}`} actions={<StatusChip label={q.st} k={TST[q.st]} />}>
            <div style={{ display: 'grid', gap: 10 }}>
              <Box component="dl" className="kv" sx={KV}>
                <dt>TDS deducted</dt><dd className="mono">{inr(q.ded)}</dd>
                <dt>Deposited</dt><dd className="mono">{inr(q.dep)}</dd>
                <dt>Deductees (owners)</dt><dd>{q.owners.length}</dd>
                <dt>Entries</dt><dd>{q.es.length}</dd>
                {q.ret?.filedOn ? <><dt>Filed on</dt><dd>{fmtD(q.ret.filedOn)}</dd><dt>Token / ack no.</dt><dd className="mono small">{q.ret.ack || ''}</dd></> : null}
                {q.lateFee ? <><dt>Late fee (₹200/day, capped)</dt><dd className="mono" style={{ color: 'var(--bad)' }}>{inr(q.lateFee)}</dd></> : null}
                <dt>Form 16A issued</dt><dd>{q.owners.length ? `${q.issued} / ${q.owners.length}` : '—'}</dd>
              </Box>
              {q.ded > q.dep + 1 ? <Banner>{inr(q.ded - q.dep)} not yet deposited — deposit before filing.</Banner> : null}
              <div className="actions">
                <Btn sm onClick={() => tdsQcsv(q.q)}>Download return data (CSV)</Btn>
                {q.es.length ? <><Btn sm primary={!q.ret?.filedOn} onClick={() => tdsReturn(q.q)}>{q.ret?.filedOn ? 'Edit filing' : 'Mark return filed'}</Btn><Btn sm onClick={() => tds16(q.q)}>Form 16A</Btn></> : null}
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <p className="small muted" style={{ margin: 0 }}>Quarterly TDS return for non-salary payments (Form 26Q, or its replacement under the Income-tax Act 2025). The CSV has deductee-wise lines — PAN, name, section, date, amount credited, rate, TDS and challan — ready for your return preparation utility.</p>
    </>
  )
}

function Certs() {
  const os = S.owners.filter(o => S.leases.some(L => L.tds && leaseOwners(L).some(x => x.ownerId === o.id)))
  const ent = tdsEntries()
  return (
    <>
      <TableCard>
        <TableHead><TableRow><TableCell>Owner</TableCell><TableCell>PAN</TableCell><TableCell>Certificate</TableCell><TableCell className="num">Limit / used FY {fy(TODAY)}</TableCell><TableCell className="num">Rate today</TableCell><TableCell /></TableRow></TableHead>
        <TableBody>
          {os.map(o => {
            const c = o.tdsCert; const used = ent.filter(x => x.ownerId === o.id && fy(x.date) === fy(TODAY) && c && x.date >= c.from && x.date <= c.to).reduce((a, x) => a + x.base, 0); const r = tdsRate(o.id, TODAY); const exp = c && c.to && daysTo(c.to) <= 30 && daysTo(c.to) >= 0
            return (
              <TableRow key={o.id}>
                <TableCell><b>{o.name}</b><div className="small muted">{o.kind || ''}</div></TableCell>
                <TableCell><span className="mono">{o.pan || '—'}</span><div>{!o.pan ? <StatusChip label="No PAN — 20%" k="bad" /> : !panValid(o) ? <StatusChip label={o.panStatus === 'Inoperative' ? 'Inoperative — 20%' : 'Invalid format — 20%'} k="bad" /> : <StatusChip label={'Valid' + (o.panCheckedOn ? ' · checked ' + fmtD(o.panCheckedOn) : '')} k="ok" />}</div></TableCell>
                <TableCell className="small">{c && c.to ? <><b>{c.type || 'Lower'} deduction · {+c.rate}%</b><br />No. {c.certNo || '—'}<br />{fmtD(c.from)} – {fmtD(c.to)} {c.to < TODAY ? <StatusChip label="Expired" k="bad" /> : exp ? <StatusChip label="Expires soon" k="warn" /> : null}{c.file ? <><br /><FileLinks files={[c.file]} /></> : null}</> : <span className="muted">None — standard rate</span>}</TableCell>
                <TableCell className="num small">{c && c.limit ? <>{inr(c.limit)}<br />used {inr(used)}{used > c.limit ? <><br /><span style={{ color: 'var(--bad)' }}>Limit exceeded — 10% applies on the excess</span></> : null}</> : '—'}</TableCell>
                <TableCell className="num"><b>{r}%</b></TableCell>
                <TableCell>{isOwner() ? null : <Btn sm onClick={() => tdsCert(o.id)}>Edit</Btn>}</TableCell>
              </TableRow>
            )
          })}
          {os.length ? null : <TableRow><TableCell colSpan={6} className="empty">No owners with TDS.</TableCell></TableRow>}
        </TableBody>
      </TableCard>
      <p className="small muted" style={{ margin: 0 }}>A certificate for lower or nil deduction applies only within its validity dates and amount limit. Without a valid, operative PAN, TDS is deducted at 20%. Rates flow into the rent schedule, invoices, opening-balance and deposit adjustments automatically.</p>
    </>
  )
}

export default function TdsPage() {
  useStore()
  const U = tdsv(); const f = U.fy
  const rows = tdsMonthRows(f), qs = tdsQuarters(f)
  const ded = rows.reduce((a, r) => a + r.ded, 0), dep = rows.reduce((a, r) => a + r.dep, 0)
  const od = rows.filter(r => r.st === 'Overdue'); const next = rows.find(r => r.bal > 0 && ['Overdue', 'Due'].includes(r.st))
  const ent = tdsEntries()
  const fys = [...new Set([fy(TODAY), ...ent.map(x => fy(x.date))])].sort().reverse()
  let body = null
  if (U.tab === 'register') body = <Register rows={rows} f={f} ded={ded} dep={dep} />
  if (U.tab === 'challans') body = <Challans f={f} />
  if (U.tab === 'returns') body = <Returns qs={qs} />
  if (U.tab === 'certs') body = <Certs />
  return (
    <Stack>
      <PageHead title="TDS" sub="Tax deducted from rent paid to owners — month-wise deposit tracking, challans, quarterly returns, Form 16A and owner certificates."
        actions={<><SrLabel htmlFor="tdsFy">Financial year</SrLabel><SelectInput grid={false} sx={fsx} id="tdsFy" aria-label="Financial year" value={f} onChange={e => setTdsFy(e.target.value)} options={fys.map(x => [x, `FY 20${x}`])} /></>} />
      <SampleBanner />
      <Kpis>
        <Kpi label="TDS deducted" value={inr(ded)} sub={`FY ${f} · ${ent.filter(x => fy(x.date) === f).length} entries`} />
        <Kpi label="Deposited" value={inr(dep)} sub={`${tdsDocs('challan').filter(c => fy(c.month + '-01') === f).length} challans`} />
        <Kpi label="Overdue" value={inr(od.reduce((a, r) => a + r.bal, 0))} sub={od.length ? od.map(r => perLabel(r.m)).join(', ') : 'Nothing overdue'} alert={!!od.length} />
        <Kpi label="Next deposit" value={next ? inr(next.bal) : '—'} sub={next ? `${perLabel(next.m)} · ${next.st === 'Overdue' ? 'was due' : 'by'} ${fmtD(next.due)}` : 'Nothing pending'} alert={!!(next && next.st === 'Overdue')} />
        <Kpi label="Returns filed" value={`${qs.filter(q => q.st === 'Filed').length} / ${qs.filter(q => q.es.length).length}`} sub={`Form 16A issued ${qs.reduce((a, q) => a + q.issued, 0)} / ${qs.reduce((a, q) => a + q.owners.length, 0)}`} alert={qs.some(q => q.st === 'Overdue')} />
      </Kpis>
      <Tabs value={U.tab} onChange={(e, v) => tdsTab(v)} variant="scrollable" scrollButtons={false}
        sx={{ '& .MuiTab-root': { color: 'var(--muted)', px: 1.5, minWidth: 0 }, '& .MuiTab-root.Mui-selected': { color: 'var(--ink)' }, '& .MuiTabs-indicator': { bgcolor: 'var(--accent)' }, '@media (max-width:760px)': { '& .MuiTab-root': { px: 1.75 } } }}>
        {TABS.map(([k, l]) => <Tab key={k} value={k} label={l} disableRipple />)}
      </Tabs>
      {body}
    </Stack>
  )
}
