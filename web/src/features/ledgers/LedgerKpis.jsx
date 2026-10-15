/* Payment KPIs for one property or the whole scope (prototype ledgerKpis). */
import { S, isOwner, inScope, useStore } from '../../store/store'
import { inr, fy, by, TODAY } from '../../domain/utils'
import { Kpis, Kpi } from '../../components/ui/Layout'

export default function LedgerKpis({ pid }) {
  useStore()
  const inv = S.invoices.filter(i => (pid ? i.propertyId === pid : inScope(i))).sort(by('date', -1))
  const paid = inv.filter(i => i.status === 'Paid')
  const fyNow = fy(TODAY)
  const ytd = paid.filter(i => fy(i.paidDate || i.date) === fyNow)
  const sum = (a, k) => a.reduce((s, i) => s + (+i[k] || 0), 0)
  const open = inv.filter(i => !['Paid', 'Rejected'].includes(i.status))
  return (
    <Kpis>
      <Kpi label={`Paid FY ${fyNow}`} value={inr(sum(ytd, 'paidAmount'))} sub={`${ytd.length} invoices`} />
      <Kpi label={`TDS deducted FY ${fyNow}`} value={inr(sum(ytd, 'tdsDeducted'))} sub={isOwner() ? 'Credited against your PAN (Form 16A)' : 'Deposit by 7th of next month'} />
      <Kpi label="In process" value={inr(sum(open, 'net'))} sub={`${open.length} invoices`} />
      {isOwner() ? null : <Kpi label={`GST under RCM FY ${fyNow}`} value={inr(sum(inv.filter(i => fy(i.date) === fyNow), 'rcm'))} sub="Payable by TrustLab, ITC claimable" />}
    </Kpis>
  )
}
