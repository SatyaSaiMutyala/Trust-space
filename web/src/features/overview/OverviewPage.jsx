/* Facilities overview — port of viewOverview + attention (reference/TruSpace.html). */
import { useStore, S, isFranchisee, partner, role } from '../../store/store'
import { newProperty, newLease, runAct } from '../../store/actions'
import { CUR, TODAY, fmtD, inr } from '../../domain/utils'
import { leaseState, rentFor, invState, slaBreached, depHeld, obOutstanding } from '../../domain/lease'
import { attentionItems } from '../../domain/attention'
import { Btn, ActLink, PageHead, Panel, Kpis, Kpi, Cols } from '../../components/ui/Layout'
import { Legend } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import SitePipelineStrip from '../sites/SitePipelineStrip'
import RentRoll from '../shared/RentRoll'
import CriticalDates from '../shared/CriticalDates'

const CHIP_LABEL = { bad: 'Act', warn: 'SLA', info: 'Reply', idle: 'Draft' }

function Attention() {
  const items = attentionItems()
  if (!items.length) return <div className="empty">All clear.</div>
  return (
    <div className="list">
      {items.slice(0, 12).map((i, n) => (
        <div className="li" key={n}>
          <span className={`chip c-${i.k}`} style={{ minWidth: 0 }}>{CHIP_LABEL[i.k]}</span>
          <div className="grow"><ActLink onClick={() => runAct(i.a)}>{i.t}</ActLink><div className="small muted">{i.s}</div></div>
        </div>
      ))}
    </div>
  )
}

export default function OverviewPage() {
  useStore()
  const props = S.properties; const active = S.leases.filter(l => ['Active', 'Renewal due', 'Notice period'].includes(leaseState(l)))
  const rentRoll = active.reduce((s, l) => s + rentFor(l, CUR), 0)
  const area = props.filter(p => ['Active', 'Notice served', 'Under fit-out'].includes(p.status)).reduce((s, p) => s + (+p.area || 0), 0)
  const pend = S.invoices.filter(i => !['Paid', 'Rejected'].includes(i.status))
  const overdue = pend.filter(i => invState(i) === 'Overdue')
  const openT = S.tickets.filter(t => !['Resolved', 'Closed'].includes(t.status))
  const p1 = openT.filter(t => t.priority === 'P1').length
  const dep = S.leases.filter(l => l.depositPaid && leaseState(l) !== 'Terminated').reduce((s, l) => s + depHeld(l), 0)
  const fr = isFranchisee()
  return (
    <>
      <PageHead
        title={fr ? 'Premises overview' : 'Facilities overview'}
        sub={`${fr ? (partner(role().partnerId)?.name || '') + '’s' : 'TrustLab’s'} rented premises on ${fmtD(TODAY)} — rent status, critical lease dates and what needs attention.`}
        actions={<><Btn onClick={newProperty}>Add property</Btn><Btn primary onClick={() => newLease()}>New lease</Btn></>}
      />
      <SampleBanner />
      <Kpis>
        <Kpi label="Monthly rent roll" value={inr(rentRoll)} sub={`${active.length} running leases · ${inr(rentRoll * 12)}/yr`} />
        <Kpi label="Leased area" value={`${area.toLocaleString('en-IN')} sq ft`} sub={`${area ? inr(rentRoll / area) : '—'} per sq ft blended`} />
        <Kpi alert={overdue.length} label="Payable to owners" value={inr(pend.reduce((s, i) => s + i.net, 0) + obOutstanding(S.leases))} sub={`${pend.length} invoices open · ${overdue.length} overdue${obOutstanding(S.leases) ? ` · ${inr(obOutstanding(S.leases))} opening arrears` : ''}`} />
        <Kpi alert={p1} label="Open tickets" value={openT.length} sub={`${p1} critical · ${openT.filter(slaBreached).length} past SLA`} />
        <Kpi label="Deposits with owners" value={inr(dep)} sub="Refundable security deposits" />
      </Kpis>
      <SitePipelineStrip />
      <Panel title="Rent roll" sub="Monthly rent status by lease. Select a month to open its invoice." actions={<Legend />}>
        <div className="tbl-wrap"><RentRoll leases={active.concat(S.leases.filter(l => leaseState(l) === 'Expired'))} /></div>
      </Panel>
      <Cols n={2}>
        <Panel title="Critical dates — next 120 days"><CriticalDates days={120} /></Panel>
        <Panel title="Needs attention"><Attention /></Panel>
      </Cols>
    </>
  )
}
