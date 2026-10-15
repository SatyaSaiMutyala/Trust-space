/* The owner's own details (prototype viewOMe). */
import { role, owner, useStore } from '../../store/store'
import { editOwner } from '../../store/actions'
import { PageHead, Panel, Btn, Stack } from '../../components/ui/Layout'
import OwnerProfile from '../owners/OwnerProfile'

export default function OwnerMePage() {
  useStore()
  const O = owner(role().ownerId); if (!O) return null
  return (
    <>
      <PageHead title="My details" sub="How TrustLab reaches you, where notices are sent, and where your rent is paid. Keep these up to date." actions={<Btn primary onClick={() => editOwner(O.id)}>Update my details</Btn>} />
      <Panel><Stack gap={2.25}><OwnerProfile O={O} full /></Stack></Panel>
    </>
  )
}
