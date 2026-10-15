/* Shown only when a signed-in account has no workspace for its role (sign-in accounts replaced access codes). */
import Box from '@mui/material/Box'
import { APP, useStore } from '../../store/store'

export default function GatePage() {
  useStore()
  const u = APP.user
  return (
    <div className="gate">
      <Box aria-hidden="true" sx={{ m: '0 auto', width: 34, height: 34, borderRadius: '8px', bgcolor: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)', font: '700 18px var(--f-display)', position: 'relative', '&::after': { content: '""', position: 'absolute', right: -3, bottom: -3, width: 11, height: 11, borderRadius: '3px', bgcolor: 'var(--sun)' } }}>T</Box>
      <h1>No access yet</h1>
      <p className="muted">{u?.name ? `You are signed in as ${u.name}, but ` : 'Your account is signed in, but '}it is not linked to any TruSpace workspace yet. Contact the Facilities desk and they will set up your access.</p>
      <p className="small muted">Facilities desk: 040 2776 5656 · admin@mytrustlab.com</p>
    </div>
  )
}
