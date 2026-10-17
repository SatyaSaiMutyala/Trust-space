/* Owner portal home (prototype viewOHome). */
import { S, role, owner, inScope, scopeProps, prop, openProp, useStore } from '../../store/store'
import { newTicket, newInvoice, openInsp } from '../../store/actions'
import { inr, fy, fmtD, perLabel, TODAY, CUR } from '../../domain/utils'
import { leaseOf, leaseState, rentFor, invState, depAdjs, isMulti, ownerShare, OB_DATE } from '../../domain/lease'
import { useOpening } from '../opening/useOpening'
import { IN_KIND } from '../../domain/constants'
import { PageHead, Panel, Btn, Banner, Kpis, Kpi } from '../../components/ui/Layout'
import { Legend } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import RentRoll from '../shared/RentRoll'
import CriticalDates from '../shared/CriticalDates'
import PropertyCard from '../properties/PropertyCard'

export default function OwnerHomePage() {
  useStore()
  const { opening } = useOpening() // the owner's own opening-balance arrears, computed by the API
  const r = role(); const O = owner(r.ownerId); const props = scopeProps()
  const inv = S.invoices.filter(inScope)
  const pend = inv.filter(i => !['Paid', 'Rejected'].includes(i.status))
  const fyNow = fy(TODAY)
  const paidFY = inv.filter(i => i.status === 'Paid' && fy(i.paidDate || i.date) === fyNow)
  const leases = props.map(p => leaseOf(p.id)).filter(Boolean)
  const obOwn = opening?.totals.outstanding || 0
  const openT = S.tickets.filter(t => inScope(t) && !['Resolved', 'Closed'].includes(t.status))
  return (
    <>
      <PageHead title={`Welcome, ${O?.name || 'owner'}`} sub="Your properties leased to TrustLab Diagnostics or its franchise partners — rent status, repairs and messages in one place."
        actions={<><Btn onClick={() => newTicket()}>Report an issue</Btn><Btn primary onClick={() => newInvoice()}>Generate invoice</Btn></>} />
      <SampleBanner />
      {leases.filter(L => depAdjs(L, r.ownerId, true).some(a => a.status === 'Proposed')).map(L => {
        const ps = depAdjs(L, r.ownerId, true).filter(a => a.status === 'Proposed')
        return (
          <Banner key={'da' + L.id} sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
            <span><b>TrustLab proposes to settle rent for {ps.map(a => perLabel(a.period)).join(', ')}</b> at {prop(L.propertyId)?.name || ''} from the security deposit you hold ({inr(ps.reduce((s2, a) => s2 + (+a.amount || 0), 0))}).</span>
            <Btn primary sm onClick={() => openProp(L.propertyId, 'lease')}>Review</Btn>
          </Banner>
        )
      })}
      {S.inspections.filter(i => inScope(i) && i.status === 'Awaiting owner sign-off').map(I => (
        <Banner key={I.id} sx={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
          <span><b>{IN_KIND[I.kind]} of {prop(I.propertyId)?.name}</b> is waiting for your signature.</span>
          <Btn primary sm onClick={() => openInsp(I.id)}>Review &amp; sign</Btn>
        </Banner>
      ))}
      <Kpis>
        <Kpi label={`Monthly rent${leases.some(isMulti) ? ' (your share)' : ''}`} value={inr(leases.filter(l => !['Draft', 'Terminated'].includes(leaseState(l))).reduce((s, l) => s + rentFor(l, CUR) * ownerShare(l, r.ownerId, 'rent'), 0))} sub={`${props.length} ${props.length === 1 ? 'property' : 'properties'}`} />
        <Kpi label={`Received FY ${fyNow}`} value={inr(paidFY.reduce((s, i) => s + (+i.paidAmount || 0), 0))} sub={`TDS ${inr(paidFY.reduce((s, i) => s + (+i.tdsDeducted || 0), 0))} credited to your PAN`} />
        <Kpi label="Awaiting payment" value={inr(pend.reduce((s, i) => s + i.net, 0) + obOwn)} sub={`${pend.length} invoices in process${obOwn ? ` · ${inr(obOwn)} from before ${fmtD(OB_DATE)}` : ''}`} alert={pend.some(i => invState(i) === 'Overdue')} />
        <Kpi label="Open repairs" value={openT.length} sub={`${openT.filter(t => t.responsibility === 'Owner').length} need your action`} />
      </Kpis>
      <Panel title="Rent status" sub="Select a month to see the invoice and payment." actions={<Legend />}>
        <RentRoll leases={leases.filter(l => l.status !== 'Draft')} />
      </Panel>
      <div className="cards">{props.map(P => <PropertyCard key={P.id} P={P} />)}</div>
      <Panel title="Coming up"><CriticalDates days={180} /></Panel>
    </>
  )
}
