/* Shell of every record drawer: sticky header (title, subtitle, close), scrolling body, sticky footer actions. */
import Box from '@mui/material/Box'
import { closeDrawer } from '../../store/store'
import { Btn } from '../ui/Layout'

export default function DrawerLayout({ title, sub, footer, children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%', flexShrink: 0 }}>
      <Box component="header" sx={{ position: 'sticky', top: 0, zIndex: 3, bgcolor: 'var(--surface)', borderBottom: '1px solid var(--line)', py: 1.75, pl: 2.5, pr: 'max(20px, env(safe-area-inset-right,0px))', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1.5, '@media (max-width:760px)': { pt: 'calc(10px + env(safe-area-inset-top,0px))', pb: 1.25, px: 1.75, '& h2': { fontSize: '1.02rem' } } }}>
        <div>
          <h2>{title}</h2>
          {sub ? <div className="small muted" style={{ marginTop: 3 }}>{sub}</div> : null}
        </div>
        <Btn sm onClick={closeDrawer} aria-label="Close" sx={{ minWidth: 40 }}>✕</Btn>
      </Box>
      <Box className="dbody" sx={{ pt: 2.25, pb: 3.75, pl: 2.5, pr: 'max(20px, env(safe-area-inset-right,0px))', display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 2.25, '&>*': { minWidth: 0 }, '@media (max-width:760px)': { py: 1.75, px: 1.5, gap: 1.75 } }}>
        {children}
      </Box>
      {footer ? (
        <Box component="footer" sx={{ position: 'sticky', bottom: 0, mt: 'auto', zIndex: 3, bgcolor: 'var(--surface)', borderTop: '1px solid var(--line)', py: 1.5, px: 2.5, pb: 'calc(12px + env(safe-area-inset-bottom,0px))', display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'flex-end', '@media (max-width:760px)': { px: 1.5, gap: 0.75, '& .MuiButton-root': { flex: '1 1 28%', whiteSpace: 'normal', minWidth: 0 } } }}>
          {footer}
        </Box>
      ) : null}
    </Box>
  )
}
