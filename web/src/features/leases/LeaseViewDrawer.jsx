/* Lease drawer — port of DRAWERS.leaseView (reference/TruSpace.html). */
import DrawerLayout from '../../components/app/DrawerLayout'
import { useStore, S, prop, owner, openProp } from '../../store/store'
import { Btn } from '../../components/ui/Layout'
import LeaseDetail from './LeaseDetail'

export default function LeaseViewDrawer({ d }) {
  useStore()
  const L = S.leases.find(l => l.id === d.id)
  if (!L) return <DrawerLayout title="Lease">Not found</DrawerLayout>
  return (
    <DrawerLayout title={prop(L.propertyId)?.name || 'Lease'} sub={owner(L.ownerId)?.name || ''}
      footer={<Btn onClick={() => openProp(L.propertyId, 'lease')}>Open property</Btn>}>
      <LeaseDetail L={L} />
    </DrawerLayout>
  )
}
