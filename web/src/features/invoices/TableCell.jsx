/*
 * MUI TableCell that honours the prototype's num / mono / small / muted classes. MUI's own cell styles
 * (font family and size) win over the global .num/.mono/.small rules, so they are re-applied here.
 */
import MuiTableCell from '@mui/material/TableCell'

export default function TableCell({ className = '', sx, ...rest }) {
  const c = ' ' + className + ' '
  const fix = {
    ...(c.includes(' num ') || c.includes(' mono ') ? { fontFamily: 'var(--f-mono)', fontVariantNumeric: 'tabular-nums' } : {}),
    ...(c.includes(' small ') ? { fontSize: 12.5 } : {}),
    ...(c.includes(' muted ') ? { color: 'var(--muted)' } : {}),
    ...(c.includes(' empty ') ? { textAlign: 'center', color: 'var(--muted)' } : {}),
  }
  return <MuiTableCell className={className} sx={[fix, ...(Array.isArray(sx) ? sx : [sx])]} {...rest} />
}
