/* Shown only when a signed-in account has no workspace for its role (sign-in accounts replaced access codes). */
import { APP, useStore } from '../../store/store'
import BrandMark from '../../components/app/BrandMark'

export default function GatePage() {
  useStore()
  const u = APP.user
  return (
    <div className="gate">
      <BrandMark size={44} sx={{ m: '0 auto' }} />
      <h1>No access yet</h1>
      <p className="muted">{u?.name ? `You are signed in as ${u.name}, but ` : 'Your account is signed in, but '}it is not linked to any TruSpace workspace yet. Contact the Facilities desk and they will set up your access.</p>
      <p className="small muted">Facilities desk: 040 2776 5656 · admin@mytrustlab.com</p>
    </div>
  )
}
