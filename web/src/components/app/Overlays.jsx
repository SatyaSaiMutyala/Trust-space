/* Global overlays: record drawer, toast, photo/video lightbox. */
import { useEffect } from 'react'
import Drawer from '@mui/material/Drawer'
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { useDispatch, useSelector } from 'react-redux'
import { dismiss } from '../../app/slices'
import { APP, closeDrawer, closeLightbox, useStore } from '../../store/store'
import { DRAWERS } from '../../features/drawers'
import ErrorBoundary from './ErrorBoundary'

export function DrawerHost() {
  useStore()
  const d = APP.drawer
  const C = d ? DRAWERS[d.kind] : null
  return (
    <Drawer anchor="right" open={!!C} onClose={closeDrawer}
      slotProps={{ paper: { sx: { width: 'min(860px, 100%)', bgcolor: 'var(--bg)', boxShadow: 'var(--shadow)', pt: 'env(safe-area-inset-top,0px)' } }, backdrop: { sx: { bgcolor: 'rgb(10 20 14 / .45)' } } }}>
      {C ? <ErrorBoundary resetKey={d._seq} title="This panel could not be shown" onClose={closeDrawer}><C key={d._seq} d={d} /></ErrorBoundary> : null}
    </Drawer>
  )
}

/** Snackbar for API messages (Redux notify queue): green for success, red for errors. */
export function ToastHost() {
  const queue = useSelector(st => st.notify.queue)
  const rdx = useDispatch()
  const n = queue[0]
  const close = (e, reason) => { if (reason !== 'clickaway' && n) rdx(dismiss(n.key)) }
  return (
    <Snackbar key={n?.key} open={!!n} autoHideDuration={n?.severity === 'error' ? 6000 : 3500} onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ '@media (max-width:760px)': { bottom: 'calc(84px + env(safe-area-inset-bottom,0px)) !important' } }}>
      {n ? <Alert onClose={close} severity={n.severity} variant="filled" sx={{ width: '100%', maxWidth: 560, fontSize: 13.5, alignItems: 'center', boxShadow: 'var(--shadow)' }}>{n.message}</Alert> : undefined}
    </Snackbar>
  )
}

export function Lightbox() {
  useStore()
  const lb = APP.lightbox
  useEffect(() => {
    if (!lb) return
    const k = e => { if (e.key === 'Escape') closeLightbox() }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [lb])
  if (!lb) return null
  return (
    <div className="lightbox" onClick={e => { if (e.target.tagName !== 'VIDEO') closeLightbox() }}>
      {lb.vid ? <><video src={lb.src} controls autoPlay playsInline /><button className="lbx" aria-label="Close" onClick={closeLightbox}>✕</button></> : <img src={lb.src} alt="" />}
    </div>
  )
}
