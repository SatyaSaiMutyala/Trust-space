/* Small building blocks shared by the site drawer sections. */
import Box from '@mui/material/Box'
import { Media, AddMedia } from '../../../components/ui/Media'
import { sphotoDel, onSphoto } from './siteActions'

/** Panel heading as in the prototype drawers (h3). */
export const H3 = ({ children }) => <h3>{children}</h3>

/**
 * The prototype's `.photos` strip for a site record: thumbnails (× to remove unless locked) followed by
 * “＋ Photo” / “＋ Video” tiles that upload into slot `k` (`__site`, `__sign`, `__earth`, `__frontvid` or a checklist key).
 */
export function SitePhotos({ st, k, files, locked, need, photoLabel, noAdd, alt = '', removeLabel = 'Remove photo', sx }) {
  return (
    <Box className="photos" sx={sx}>
      {(files || []).map((f, ix) => (
        <span className="pwrap" key={f.id || ix}>
          <Media f={f} alt={alt} />
          {locked ? null : <button type="button" className="px" onClick={() => sphotoDel(k, ix)} aria-label={removeLabel}>×</button>}
        </span>
      ))}
      {locked || noAdd ? null : <>
        <AddMedia need={need} multiple label={photoLabel} onFiles={fl => onSphoto(st, k, fl)} />
        <AddMedia video onFiles={fl => onSphoto(st, k, fl)} />
      </>}
    </Box>
  )
}

/** `.field` wrapper used outside a form grid (label above custom content). */
export function Field({ label, children, sx, id }) {
  return (
    <Box className="field" id={id} sx={[{ display: 'grid', gap: 0.5, minWidth: 0, mt: 1.25 }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Box component="label" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{label}</Box>
      {children}
    </Box>
  )
}
