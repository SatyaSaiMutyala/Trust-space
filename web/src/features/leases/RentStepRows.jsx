/* "Rent changes" of the lease form: the agreement's own increases when they do not follow the regular rule
   (10% after 3 years, then 15% each year…). Each change is one labelled line, like the rest of the form: the date it
   applies from, the increase as a %, a ₹ amount or the new rent, and optionally a repeat every N months until a date;
   the rent it leads to is shown under the line. On a change's date it replaces the rule's increase; the rule continues
   from there (paused inside a repeat window). Fields are uncontrolled (rs-id, rs-from, rs-kind, rs-value, rs-every,
   rs-until), read in order by readRentSteps() in actions.js, like the co-owner rows. */
import Box from '@mui/material/Box'
import { Btn } from '../../components/ui/Layout'
import { TextInput, SelectInput } from '../../components/form/Fields'
import { fmtD, inr } from '../../domain/utils'

const KINDS = [['pct', '% increase'], ['amt', '₹ added per month'], ['rent', 'New rent (₹)']]
const GRID = { display: 'grid', gridTemplateColumns: 'minmax(150px,1.2fr) minmax(150px,1.3fr) minmax(90px,.8fr) minmax(90px,.8fr) minmax(150px,1.2fr) auto', gap: 1.5, alignItems: 'start', '@media (max-width:760px)': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' } }
const DATE_SX = { '& input': { width: 118, py: '8px', boxSizing: 'content-box' } } // the native date input sizes itself; fix the inner width so dd/mm/yyyy and the calendar icon both fit
const NUM_SX = { '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '8px' } }

/** rows = [{ key, s: { id, from, kind, value, every, until } }]; resolved = resolvedRentSteps(preview) to show the rent after each change. */
export default function RentStepRows({ rows, resolved, onAdd, onDel, hasRule }) {
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {rows.map(({ key, s }, i) => { const r = (resolved || []).find(x => x.id === s.id); return (
        <Box key={key} className="rsrow" sx={{ border: '1px solid var(--line)', borderRadius: 2, p: 1.5, display: 'grid', gap: 1 }}>
          <Box sx={GRID}>
            <input type="hidden" name="rs-id" value={s.id} readOnly />
            <TextInput grid={false} type="date" name="rs-from" label="Applies from" defaultValue={s.from || ''} sx={DATE_SX} />
            <SelectInput grid={false} name="rs-kind" label="Increase" options={KINDS} defaultValue={s.kind || 'pct'} sx={{ '& select': { py: '8px' } }} />
            <TextInput grid={false} type="number" name="rs-value" label="Value" min="0" step="0.01" defaultValue={s.value || ''} sx={NUM_SX} />
            <TextInput grid={false} type="number" name="rs-every" label="Repeat every (months)" min="0" step="1" defaultValue={s.every || ''} placeholder="once" sx={NUM_SX} />
            <TextInput grid={false} type="date" name="rs-until" label="Until" defaultValue={s.until || ''} sx={DATE_SX} />
            <Btn sm ghost onClick={() => onDel(key)} aria-label="Remove rent change" sx={{ mt: '6px' }}>✕</Btn>
          </Box>
          <div className="small muted">
            <b style={{ color: 'var(--ink)' }}>Change {i + 1}:</b>{' '}
            {r ? <>rent becomes <span className="mono" style={{ color: 'var(--ink)' }}>{inr(r.rent)}</span>{r.before ? ` (from ${inr(r.before)})` : ''} from {fmtD(r.from)}{s.every > 0 ? `, then the same change every ${s.every} months${s.until ? ` until ${fmtD(s.until)}` : ' to the end of the lease'}` : ''}.</> : 'fill in the date and the value.'}
          </div>
        </Box>) })}
      <div className="filters" style={{ alignItems: 'center' }}>
        <Btn sm onClick={onAdd}>＋ Add a rent change</Btn>
        <span className="small muted">{rows.length ? (hasRule ? 'On each date here the change replaces the rule’s increase and applies on the rent in force just before it; the rule then continues from that date. “Repeat every” applies the same change again every N months until the Until date (or the end of the lease); the rule is paused inside that window. Set “Escalate every” to 0 to switch the rule off and use only these.' : 'The rent follows these changes; after the last one it stays at that figure.') : hasRule ? 'For increases that do not follow the rule above — e.g. 10% after 3 years instead of the usual.' : 'Type each increase from the agreement: the date, and a %, a ₹ amount or the new rent.'}</span>
      </div>
    </Box>
  )
}
