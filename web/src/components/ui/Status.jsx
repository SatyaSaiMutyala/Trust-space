/* Status, progress and choice widgets. */
import { useEffect, useState } from 'react'
import { CHIP, PRI, PRI_K } from '../../domain/constants'
import { fmtDT } from '../../domain/utils'
import { Btn } from './Layout'

/** Pill with a coloured dot. k = ok | warn | bad | info | idle (defaults from the status map). */
export function StatusChip({ label, k, className = '', style }) {
  return <span className={`chip c-${k || CHIP[label] || 'idle'} ${className}`} style={style}>{label}</span>
}
export const PriChip = ({ p }) => <StatusChip label={PRI[p]?.l || p} k={PRI_K[p]} />

/** Count badge (hot = red). */
export const Badge = ({ n, hot }) => <span className={'badge' + (hot ? ' hot' : '')}>{n}</span>

/** Rent-roll colour legend. */
export function Legend() {
  return (
    <div className="legend">
      <span><i style={{ background: 'color-mix(in srgb,var(--ok) 78%,transparent)' }} />Paid</span>
      <span><i style={{ background: 'color-mix(in srgb,var(--info) 30%,transparent)' }} />In process</span>
      <span><i style={{ background: 'color-mix(in srgb,var(--bad) 25%,transparent)', outline: '1px solid var(--bad)' }} />Overdue</span>
      <span><i style={{ outline: '1px dashed var(--bad)' }} />Not invoiced</span>
      <span><i style={{ background: 'var(--sunk)' }} />Upcoming</span>
    </div>
  )
}

/** Circular score (0–100). */
export function Ring({ pct, k }) {
  const r = 17, c = 2 * Math.PI * r
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" aria-label={`Score ${pct}%`} role="img">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--sunk)" strokeWidth="5" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={`var(--${k})`} strokeWidth="5" strokeDasharray={`${c * pct / 100} ${c}`} transform="rotate(-90 22 22)" strokeLinecap="round" />
      <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--ink)" fontFamily="IBM Plex Mono, monospace">{pct}</text>
    </svg>
  )
}

/** Horizontal progress bar (0–100). */
export const Progress = ({ pct }) => <div className="prog"><i style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>

/** Numbered process steps. stage = number of completed steps. */
export function Steps({ steps, stage }) {
  return <div className="steps">{steps.map((s, i) => <div key={s} className={`step ${i + 1 <= stage ? 'done' : i + 1 === stage + 1 ? 'now' : ''}`}><b>{s}</b>{i + 1 <= stage ? 'Done' : i + 1 === stage + 1 ? 'Next' : ''}</div>)}</div>
}

/** Activity log. entries: {text, by, at, extra?, meta?}[] */
export function Timeline({ entries }) {
  return <div className="timeline">{entries.map((l, i) => <div className="tl" key={i}><div style={{ whiteSpace: 'pre-wrap' }}>{l.text}</div>{l.extra}<div className="m">{l.by} · {fmtDT(l.at)}{l.meta || ''}</div></div>)}</div>
}

/** Segmented choice buttons. options: [value, label, colourKind?][]; clicking the selected value again clears it when `toggle`. */
export function Seg({ options, value, onChange, ariaLabel, role = 'radiogroup', itemRole = 'radio', onKind = 'ok', sx }) {
  return (
    <div className="seg-wrap" role={role} aria-label={ariaLabel} style={{ display: 'flex', flexWrap: 'wrap', gap: 4, ...sx }}>
      {options.map(o => {
        const [v, l, k] = Array.isArray(o) ? o : [o, o]
        const on = value === v; const kind = k || onKind
        return (
          <button type="button" className="segbtn" key={v} role={itemRole} aria-checked={itemRole === 'radio' ? on : undefined} aria-selected={itemRole === 'tab' ? on : undefined}
            onClick={() => onChange(v)}
            style={{ font: 'inherit', fontSize: 13, fontWeight: 500, border: `1px solid ${on ? `var(--${kind})` : 'var(--line)'}`, background: on ? `var(--${kind})` : 'var(--surface)', color: on ? '#fff' : 'var(--ink)', borderRadius: 6, padding: '6px 11px', cursor: 'pointer', minHeight: 36 }}
          >{l}</button>
        )
      })}
    </div>
  )
}

/** Delete button that needs a second click within 4 s to confirm. */
export function ConfirmButton({ onConfirm, label = 'Delete', confirmLabel = 'Click again to delete', sm, ...rest }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t) }, [armed])
  return <Btn danger sm={sm} onClick={() => armed ? onConfirm() : setArmed(true)} {...rest}>{armed ? confirmLabel : label}</Btn>
}
