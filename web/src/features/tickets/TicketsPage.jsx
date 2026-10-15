/*
 * Repairs & tickets (prototype viewTickets). Server-side list: search (number, title, category, assignee), status
 * (incl. All open), property, responsibility, priority, raised-date range and pagination via GET /api/tickets.
 */
import { scopeProps, useStore } from '../../store/store'
import { TSTAT, PRI } from '../../domain/constants'
import { PageHead, Stack } from '../../components/ui/Layout'
import { SampleBanner } from '../../components/app/Banners'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import ComboFilter from '../invoices/ComboFilter'
import TicketTable from './TicketTable'

const STATUS = [['open', 'All open', { status: '', open: 'true' }], ...TSTAT.map(s => [s, s, { status: s, open: '' }])]

export default function TicketsPage() {
  useStore()
  const L = useServerList('tickets', 'tickets', { defaults: { limit: 10 } })
  return (
    <Stack>
      <PageHead title="Repairs & tickets" sub="Log every repair with photos, assign it, and keep the owner in the loop. SLA runs from the moment a ticket is raised: P1 4 h, P2 24 h, P3 72 h, P4 7 days." />
      <SampleBanner />
      <ListToolbar list={L} searchPlaceholder="Search number, issue, category or assignee" dateLabel="Raised">
        <ComboFilter list={L} label="Status" allLabel="All statuses" options={STATUS} width={160} />
        <ListFilter list={L} name="propertyId" label="Property" allLabel="All properties" width={220} options={scopeProps().map(p => [p.id, p.name])} />
        <ListFilter list={L} name="responsibility" label="Responsibility" allLabel="Any responsibility" options={['Owner', 'TrustLab', 'Shared']} />
        <ListFilter list={L} name="priority" label="Priority" allLabel="Any priority" width={150} options={Object.entries(PRI).map(([k, v]) => [k, v.l])} />
      </ListToolbar>
      <TicketTable server={L} pid={null} />
      <Pager list={L} />
    </Stack>
  )
}
