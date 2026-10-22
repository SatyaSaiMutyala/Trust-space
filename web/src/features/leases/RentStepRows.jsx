/* "Rent changes" rows of the lease form: the agreement's own increases when they do not follow the regular rule
   (10% after 3 years, then 15% each year…). Each row: the date it applies from, the increase as a %, a ₹ amount or the
   new rent, and optionally a repeat every N months until a date. On a row's date the change replaces the rule's
   increase; the rule continues from there (paused inside a repeat window). Fields are uncontrolled (rs-id, rs-from,
   rs-kind, rs-value, rs-every, rs-until), read in order by readRentSteps() in actions.js, like the co-owner rows. */
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { Btn } from '../../components/ui/Layout'
import { TextInput, SelectInput } from '../../components/form/Fields'
import { fmtD, inr } from '../../domain/utils'

const KINDS = [['pct', '% increase'], ['amt', '₹ added per month'], ['rent', 'New rent (₹)']]
const SX = { '& .MuiTableCell-root': { fontSize: 12.5, verticalAlign: 'middle' }, '& .MuiTableCell-head': { fontSize: 11 } }
const DATE_SX = { '& input': { width: 132, py: '7px', boxSizing: 'content-box' } } // the native date input sizes itself; fix the inner width so dd/mm/yyyy and the calendar icon both fit
const NUM_SX = { width: 130, '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '7px' } }

/** rows = [{ key, s: { id, from, kind, value, every, until } }]; resolved = resolvedRentSteps(preview) to show the rent after each change. */
export default function RentStepRows({ rows, resolved, onAdd, onDel, hasRule }) {
  return (
    <>
      {rows.length ? (
        <div className="tbl-wrap">
          <Table size="small" className="otable oedit" sx={SX}>
            <TableHead><TableRow><TableCell>Applies from</TableCell><TableCell>Increase</TableCell><TableCell className="num">Value</TableCell><TableCell className="num">Repeat every (months)</TableCell><TableCell>Until</TableCell><TableCell className="num">Rent after</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {rows.map(({ key, s }) => { const r = (resolved || []).find(x => x.id === s.id); return (
                <TableRow key={key} className="rsrow">
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><input type="hidden" name="rs-id" value={s.id} readOnly /><TextInput grid={false} type="date" name="rs-from" defaultValue={s.from || ''} htmlInput={{ 'aria-label': 'Applies from' }} sx={DATE_SX} /></TableCell>
                  <TableCell><SelectInput grid={false} name="rs-kind" aria-label="Kind of increase" options={KINDS} defaultValue={s.kind || 'pct'} sx={{ minWidth: 170, '& select': { py: '7px' } }} /></TableCell>
                  <TableCell className="num"><TextInput grid={false} type="number" name="rs-value" min="0" step="0.01" defaultValue={s.value || ''} htmlInput={{ 'aria-label': 'Value' }} sx={NUM_SX} /></TableCell>
                  <TableCell className="num"><TextInput grid={false} type="number" name="rs-every" min="0" step="1" defaultValue={s.every || ''} placeholder="once" htmlInput={{ 'aria-label': 'Repeat every (months)' }} sx={{ width: 96, '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '7px' } }} /></TableCell>
                  <TableCell><TextInput grid={false} type="date" name="rs-until" defaultValue={s.until || ''} htmlInput={{ 'aria-label': 'Until' }} sx={DATE_SX} /></TableCell>
                  <TableCell className="num mono">{r ? <>{inr(r.rent)}<div className="small muted">{r.before ? `from ${inr(r.before)}` : ''}{r.from ? ` · ${fmtD(r.from)}` : ''}{s.every > 0 ? ` · then every ${s.every} mo${s.until ? ' until ' + fmtD(s.until) : ' to the end'}` : ''}</div></> : <span className="muted">—</span>}</TableCell>
                  <TableCell><Btn sm ghost onClick={() => onDel(key)} aria-label="Remove rent change">✕</Btn></TableCell>
                </TableRow>) })}
            </TableBody>
          </Table>
        </div>
      ) : null}
      <div className="filters" style={{ marginTop: rows.length ? 6 : 0, alignItems: 'center' }}>
        <Btn sm onClick={onAdd}>＋ Add a rent change</Btn>
        <span className="small muted">{rows.length ? (hasRule ? 'On each date here the change replaces the rule’s increase and applies on the rent in force just before it; the rule then continues from that date. Set “Escalate every” to 0 to switch the rule off and use only these. “Repeat every” applies the same change again every N months until the Until date (or the end of the lease); the rule is paused inside that window.' : 'The rent follows this table; after the last change it stays at that figure.') : hasRule ? 'For increases that do not follow the rule above — e.g. 10% after 3 years instead of the usual.' : 'Type each increase from the agreement: the date, and a %, a ₹ amount or the new rent.'}</span>
      </div>
    </>
  )
}
