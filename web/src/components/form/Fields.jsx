/*
 * Global form fields on MUI's 12-column Grid. Every field is half width (6/12) from `sm` up and full width on phones;
 * pass `full` for 12/12. Fields are uncontrolled by default (name + defaultValue) so forms read values with FormData,
 * exactly like the prototype; pass value/onChange for controlled use.
 */
import Grid from '@mui/material/Grid'
import TextField from '@mui/material/TextField'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Box from '@mui/material/Box'

const cell = (full, size) => size || (full ? 12 : { xs: 12, sm: 6 })

/** Grid container for a form. */
export function FormGrid({ children, spacing = 2, sx }) {
  return <Grid container columnSpacing={spacing} rowSpacing={1.5} sx={sx}>{children}</Grid>
}

/** Grid cell for custom content inside a FormGrid. */
export function Cell({ full, size, children, sx, id }) {
  return <Grid size={cell(full, size)} sx={sx} id={id}>{children}</Grid>
}

/** Full-width section heading inside a form ("1 · Identity & tax"). first = no top rule. */
export function SectionTitle({ children, first }) {
  return (
    <Grid size={12}>
      <Box className="eyebrow" sx={first ? {} : { borderTop: '1px solid var(--line)', pt: 1.5, mt: 0.5 }}>{children}</Box>
    </Grid>
  )
}

/** Label + hint wrapper for content that is not a text field (file drops, checkbox groups, previews). */
export function FieldBox({ id, label, hint, full, size, children }) {
  return (
    <Grid size={cell(full, size)} sx={{ display: 'grid', gap: 0.5, minWidth: 0, alignContent: 'start' }}>
      {label ? <Box component="label" htmlFor={id} sx={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{label}</Box> : null}
      {children}
      {hint ? <span className="hint" style={{ fontSize: 11.5, color: 'var(--muted)' }}>{hint}</span> : null}
    </Grid>
  )
}

function buildHtmlInput({ readOnly, min, max, step, maxLength, inputMode, pattern, autoComplete, upper, htmlInput, style }) {
  return { readOnly, min, max, step, maxLength, inputMode, pattern, autoComplete, style: { ...(upper ? { textTransform: 'uppercase' } : {}), ...style }, ...htmlInput }
}

/**
 * Text / number / date / month / email / tel / url input. error = message shown in red under the field (e.g. the API’s field error).
 * multiline → textarea (minRows defaults to 3). grid={false} renders the bare TextField (no Grid cell).
 */
export function TextInput({ id, name, label, hint, error, full, size, grid = true, type = 'text', defaultValue, value, onChange, onBlur, onFocus, onKeyDown, required, disabled, placeholder, multiline, minRows, list, sx, ...rest }) {
  const field = (
    <TextField
      id={id || (name ? `f-${name}` : undefined)} name={name} label={label} type={type}
      defaultValue={value === undefined ? (defaultValue ?? '') : undefined} value={value}
      onChange={onChange} onBlur={onBlur} onFocus={onFocus} onKeyDown={onKeyDown} required={required} disabled={disabled} placeholder={placeholder}
      multiline={multiline} minRows={multiline ? (minRows || 3) : undefined}
      helperText={error || hint} error={!!error} sx={sx}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { ...buildHtmlInput(rest), list }, formHelperText: { component: 'div' } }}
    />
  )
  return grid ? <Grid size={cell(full, size)}>{field}</Grid> : field
}

/** Native select. options: value | [value, label] | {value,label,disabled}. */
export function SelectInput({ id, name, label, hint, error, full, size, grid = true, options, defaultValue, value, onChange, required, disabled, sx, placeholder, 'aria-label': ariaLabel }) {
  const opts = options.map(o => Array.isArray(o) ? { value: o[0], label: o[1] } : typeof o === 'object' ? o : { value: o, label: o })
  const field = (
    <TextField
      select id={id || (name ? `f-${name}` : undefined)} name={name} label={label}
      defaultValue={value === undefined ? String(defaultValue ?? (placeholder !== undefined ? '' : opts[0]?.value ?? '')) : undefined} value={value === undefined ? undefined : String(value ?? '')}
      onChange={onChange} required={required} disabled={disabled} helperText={error || hint} error={!!error} sx={sx}
      slotProps={{ select: { native: true }, htmlInput: { 'aria-label': ariaLabel }, inputLabel: { shrink: true }, formHelperText: { component: 'div' } }}
    >
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {opts.map(o => <option key={String(o.value)} value={o.value} disabled={o.disabled}>{o.label}</option>)}
    </TextField>
  )
  return grid ? <Grid size={cell(full, size)}>{field}</Grid> : field
}

/** Checkbox with label. Uncontrolled (defaultChecked) unless checked is passed. */
export function CheckField({ id, name, label, full = true, size, grid = true, defaultChecked, checked, onChange, required, disabled, sx }) {
  const field = (
    <FormControlLabel
      sx={[{ alignItems: 'flex-start', m: 0, gap: 0.5, '& .MuiCheckbox-root': { p: 0.25, mt: '-1px' }, '& .MuiFormControlLabel-label': { fontSize: 13.5 }, '& .MuiFormControlLabel-asterisk': { display: 'none' }, '@media (pointer:coarse)': { minHeight: 44, alignItems: 'center' } }, ...(Array.isArray(sx) ? sx : [sx])]}
      control={<Checkbox id={id || (name ? `f-${name}` : undefined)} name={name} defaultChecked={checked === undefined ? !!defaultChecked : undefined} checked={checked} onChange={onChange} required={required} disabled={disabled} />}
      label={label}
    />
  )
  return grid ? <Grid size={cell(full, size)} sx={{ display: 'flex', alignItems: 'flex-end' }}>{field}</Grid> : field
}

/** File picker in a dashed drop area; children = what is already uploaded. */
export function FileInput({ id, name, label, hint, full = true, size, accept, multiple, capture, required, children, onChange }) {
  return (
    <FieldBox id={id} label={label} hint={hint} full={full} size={size}>
      <div className="drop">
        {children}
        <input type="file" id={id} name={name} accept={accept} multiple={multiple} capture={capture} required={required} onChange={onChange} style={{ maxWidth: '100%' }} />
      </div>
    </FieldBox>
  )
}
