/* Owner details drawer (prototype DRAWERS.ownerView + verifyBank). */
import { S, owner, useStore } from '../../store/store'
import { editOwner } from '../../store/actions'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn, Stack } from '../../components/ui/Layout'
import OwnerProfile from './OwnerProfile'
import { verifyBank } from './actions'

export default function OwnerViewDrawer({ d }) {
  useStore()
  const O = owner(d.id)
  if (!O) return <DrawerLayout title="Owner" />
  return (
    <DrawerLayout title={O.name} sub={`${O.kind}${O.party === 'Co-share' ? ' · Co-share (not on the agreement)' : ''} · ${S.properties.filter(p => p.ownerId === O.id).map(p => p.code).join(', ')}`}
      footer={<>
        {O.bankPending || (!O.bankVerified && O.acctNo) ? <Btn onClick={() => verifyBank(O.id)}>Mark bank verified</Btn> : null}
        <Btn primary onClick={() => editOwner(O.id)}>Edit</Btn>
      </>}>
      <Stack gap={2.25}><OwnerProfile O={O} full /></Stack>
    </DrawerLayout>
  )
}
