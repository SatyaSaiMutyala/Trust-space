/*
 * Rent & invoices / Invoices & payments (prototype viewInvoices). The register is a server-side list:
 * search (number, description, UTR), type, status (incl. Overdue / All open), property, invoice-date range and
 * pagination via GET /api/invoices (useServerList).
 */
import { S, isOwner, scopeProps, useStore } from '../../store/store'
import { newInvoice } from '../../store/actions'
import { leaseState } from '../../domain/lease'
import { INV_TYPES } from '../../domain/constants'
import { PageHead, Panel, Btn } from '../../components/ui/Layout'
import { Legend } from '../../components/ui/Status'
import { SampleBanner } from '../../components/app/Banners'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import RentRoll from '../shared/RentRoll'
import LedgerKpis from '../ledgers/LedgerKpis'
import InvoiceTable from './InvoiceTable'
import ComboFilter from './ComboFilter'
import { exportCsv } from './actions'

const NONE = { status: '', overdue: '', open: '' }
const STATUS = [
  ...['Submitted', 'Verified', 'Approved'].map(s => [s, s, { ...NONE, status: s }]),
  ['overdue', 'Overdue', { ...NONE, overdue: 'true' }],
  ['open', 'All open', { ...NONE, open: 'true' }],
  ...['Paid', 'Rejected'].map(s => [s, s, { ...NONE, status: s }]),
]

export default function InvoicesPage() {
  useStore()
  const L = useServerList('invoices', 'invoices', { defaults: { limit: 10 } })
  const o = isOwner()
  return (
    <>
      <PageHead
        title={o ? 'Invoices & payments' : 'Rent & invoices'}
        sub={o ? 'Raise rent, electricity and maintenance invoices to TrustLab, or upload your own. Track verification and payment here.' : 'Owner invoices move from Submitted → Verified by Accounts Payable → Approved by CMD → Paid. TDS and RCM are calculated from each lease.'}
        actions={<>
          <Btn onClick={exportCsv}>Download statement (CSV)</Btn>
          {o ? <><Btn onClick={() => newInvoice({ mode: 'upload' })}>Upload invoice</Btn><Btn primary onClick={() => newInvoice()}>Generate invoice</Btn></> : <Btn primary onClick={() => newInvoice()}>Record owner invoice</Btn>}
        </>}
      />
      <SampleBanner />
      {o ? <LedgerKpis pid={null} /> : (
        <Panel title="Rent roll" actions={<Legend />}>
          <RentRoll leases={S.leases.filter(l => !['Draft', 'Terminated'].includes(leaseState(l)))} />
        </Panel>
      )}
      <ListToolbar list={L} searchPlaceholder="Search number, description or UTR" dateLabel="Invoice date">
        <ListFilter list={L} name="type" label="Type" allLabel="All types" options={INV_TYPES} width={150} />
        <ComboFilter list={L} label="Status" allLabel="All statuses" options={STATUS} width={150} />
        <ListFilter list={L} name="propertyId" label="Property" allLabel="All properties" width={220} options={scopeProps().map(p => [p.id, p.name])} />
      </ListToolbar>
      <InvoiceTable list={L} compact={false} />
      <Pager list={L} />
    </>
  )
}
