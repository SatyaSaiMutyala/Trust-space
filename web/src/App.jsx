import { useSelector } from 'react-redux'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import AppShell from './components/app/AppShell'
import { DrawerHost, ToastHost, Lightbox } from './components/app/Overlays'
import { Btn } from './components/ui/Layout'
import CurrentPage from './features/pages'
import LoginPage from './features/auth/LoginPage'
import { useStore } from './store/store'
import { dispatch } from './app/store'
import { loadPortfolio } from './app/bootstrap'
import { signOut } from './services/auth'
import { AppSkeleton } from './components/ui/Skeletons'

/** Full-screen state while signing in / loading, or when loading failed. */
function Splash({ text, error }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', p: 3, bgcolor: 'var(--bg)' }}>
      <Box sx={{ textAlign: 'center', display: 'grid', gap: 2, justifyItems: 'center', maxWidth: 420 }}>
        <Box aria-hidden="true" sx={{ width: 52, height: 52, borderRadius: '12px', bgcolor: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)', font: '700 26px var(--f-display)' }}>T</Box>
        {error ? (
          <>
            <Box sx={{ fontWeight: 600 }}>Your portfolio could not be loaded</Box>
            <Box className="muted small">{error}</Box>
            <div className="actions" style={{ justifyContent: 'center' }}>
              <Btn primary onClick={() => dispatch(loadPortfolio())}>Try again</Btn>
              <Btn onClick={signOut}>Sign out</Btn>
            </div>
          </>
        ) : (
          <>
            <CircularProgress size={28} sx={{ color: 'var(--accent)' }} />
            <Box className="muted">{text}</Box>
          </>
        )}
      </Box>
    </Box>
  )
}

export default function App() {
  useStore()
  const auth = useSelector(s => s.auth.status)
  const data = useSelector(s => s.entities.status)
  const error = useSelector(s => s.entities.error)
  let body
  if (auth === 'checking') body = <Splash text="Checking your sign-in…" />
  else if (auth === 'signedOut') body = <LoginPage />
  else if (data === 'failed') body = <Splash error={error} />
  else if (data !== 'ready') body = <AppSkeleton />
  else body = <><AppShell><CurrentPage /></AppShell><DrawerHost /><Lightbox /></>
  return <>{body}<ToastHost /></>
}
