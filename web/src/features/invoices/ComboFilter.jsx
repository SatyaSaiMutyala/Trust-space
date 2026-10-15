/*
 * A filter select for a useServerList() list where each option may set several API filters at once,
 * e.g. invoice status “Overdue” → ?overdue=true, “All open” → ?open=true, “Paid” → ?status=Paid.
 * options: [value, label, filtersPatch][] — the first option whose filters all match the list's filters is shown.
 * Looks and wraps like the list kit's <ListFilter>.
 */
import TextField from '@mui/material/TextField'

const ctlSx = { '& .MuiOutlinedInput-root': { bgcolor: 'var(--surface)' } }

export default function ComboFilter({ list, label, options, allLabel = 'All', width = 170 }) {
  const names = [...new Set(options.flatMap(o => Object.keys(o[2])))]
  const f = list.params.filters
  const cur = options.find(([, , p]) => Object.entries(p).every(([k, v]) => String(f[k] ?? '') === String(v)) && names.every(k => k in p || !f[k]))
  const change = e => {
    const o = options.find(x => x[0] === e.target.value)
    const patch = Object.fromEntries(names.map(k => [k, '']))
    list.set({ filters: { ...patch, ...(o ? o[2] : {}) } })
  }
  return (
    <TextField select size="small" label={label} value={cur ? cur[0] : ''} onChange={change}
      sx={{ width, flex: `0 1 ${width}px`, minWidth: 130, ...ctlSx, '@media (max-width:600px)': { flex: '1 1 140px', width: 'auto' } }}
      slotProps={{ select: { native: true }, inputLabel: { shrink: true } }}>
      <option value="">{allLabel}</option>
      {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
    </TextField>
  )
}
