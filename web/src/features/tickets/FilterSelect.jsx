/* Compact native select for filter rows and page-head pickers (the prototype's bare <select aria-label>). */
import TextField from '@mui/material/TextField'

export default function FilterSelect({ id, name, ariaLabel, value, defaultValue, onChange, options, placeholder, sx }) {
  const opts = options.map(o => Array.isArray(o) ? o : [o, o])
  return (
    <TextField select id={id} name={name} value={value} defaultValue={defaultValue} onChange={onChange} fullWidth={false}
      sx={[{ minWidth: 0, maxWidth: '100%' }, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={{ select: { native: true }, htmlInput: { 'aria-label': ariaLabel } }}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </TextField>
  )
}
