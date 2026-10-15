/*
 * Properties — port of viewProperties. Server-side list via GET /api/properties (useServerList): search (name, code,
 * city, state, address, branch, type), status, type and city filters, pagination. The API scopes the rows to the
 * signed-in workspace (an owner gets only their own premises).
 * The prototype's “Rent status” and “Repairs” filters were computed in the browser from leases, invoices and tickets;
 * they cannot run on the server and are not offered here (each card still shows both statuses).
 */
import { useStore, S, isOwner } from '../../store/store'
import { newProperty } from '../../store/actions'
import { TYPES } from '../../domain/constants'
import { Btn, PageHead, Empty } from '../../components/ui/Layout'
import { SampleBanner } from '../../components/app/Banners'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import { CardsSkeleton, Refreshing } from '../../components/ui/Skeletons'
import PropertyCard from './PropertyCard'

/** Property status values stored on the record (the API's allowed values). */
const STATUSES = ['Pipeline', 'Under fit-out', 'Active', 'Notice served', 'Vacated']

export default function PropertiesPage() {
  useStore()
  const L = useServerList('properties', 'properties', { defaults: { limit: 12 } })
  const o = isOwner()
  const cities = [...new Set(S.properties.map(p => (p.city || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return (
    <>
      <PageHead
        title={o ? 'My properties' : 'Properties'}
        sub={o ? 'Premises you have leased to TrustLab Diagnostics.' : 'Every premises TrustLab rents or is negotiating, with its owner, lease and live status.'}
        actions={o ? null : <Btn primary onClick={newProperty}>Add property</Btn>}
      />
      <SampleBanner />
      <ListToolbar list={L} searchPlaceholder="Search name, code, city or address">
        <ListFilter list={L} name="status" label="Status" allLabel="Any status" options={STATUSES} />
        <ListFilter list={L} name="type" label="Type" allLabel="Any type" width={190} options={TYPES} />
        {cities.length > 1 ? <ListFilter list={L} name="city" label="City" allLabel="All cities" options={cities} /> : null}
      </ListToolbar>
      {!L.rows.length && L.isFetching ? <CardsSkeleton count={6} /> : L.rows.length
        ? <Refreshing on={L.isFetching}><div className="cards">{L.rows.map(P => <PropertyCard key={P.id} P={S.properties.find(x => x.id === P.id) || P} />)}</div></Refreshing>
        : <Empty panel>{L.message || 'No properties found.'}{o || L.filtered ? '' : ' Use “Add property” to register premises.'}</Empty>}
      <Pager list={L} sizes={[12, 24, 48, 96]} />
    </>
  )
}
