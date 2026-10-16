/* The TruSpace logo (public/logo.png). Decorative: the "TruSpace" name next to it carries the meaning. */
import Box from '@mui/material/Box'

export default function BrandMark({ size = 34, sx }) {
  return <Box component="img" src="/logo.png" alt="" aria-hidden="true" sx={{ width: size, height: size, flex: 'none', display: 'block', ...sx }} />
}
