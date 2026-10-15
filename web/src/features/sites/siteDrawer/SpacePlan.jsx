/* Space & requirements plan (data-sq needed / data-sa available). */
import Box from '@mui/material/Box'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { spaceReq, spaceStatus } from '../../../domain/site'
import { SPACE } from '../../../domain/constants'
import { Panel, TableCard } from '../../../components/ui/Layout'
import { StatusChip } from '../../../components/ui/Status'
import { TextInput } from '../../../components/form/Fields'
import { onSq, onSa, onSd } from './siteActions'
import { H3 } from './parts'

/* Phones: each requirement becomes a small card — label on top, Needed / Available inputs side by side, result below — so nothing scrolls sideways. */
const spaceSx = {
  minWidth: 0,
  '@media (max-width:600px)': {
    '& table.space, & table.space tbody': { display: 'block', width: '100%' },
    '& table.space thead': { display: 'none' },
    '& table.space tr': { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', columnGap: 1.5, rowGap: 0.75, px: 1.75, py: 1.25, borderBottom: '1px solid var(--line)' },
    '& table.space tr:last-child': { borderBottom: 0 },
    '& table.space td': { display: 'block', border: 0, p: 0, textAlign: 'left', minWidth: 0 },
    '& table.space td:first-of-type, & table.space td:last-of-type': { gridColumn: '1 / -1' },
    '& table.space td[data-label]::before': { content: 'attr(data-label)', display: 'block', textAlign: 'left', mb: 0.5, font: '600 10.5px/1.3 var(--f-body)', textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)' },
    '& table.space td .MuiTextField-root, & table.space td input': { width: '100%' },
  },
}

const numSx = needv => [{ width: 110, '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '7px' } }, needv && { '& .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--bad)' } }]

export default function SpacePlan({ st, slock }) {
  const sp = spaceStatus(st); const av = st.space || {}
  return (
    <Panel id="it-__space" body={false} title={<H3>Space &amp; requirements plan</H3>}
      sub={`Requirement for a ${(st.purpose || '').toLowerCase()} against what this site offers. Edit a requirement if this site needs a different standard.`}
      actions={sp.filled ? <StatusChip label={`${sp.met}/${sp.need} met`} k={sp.met === sp.need ? 'ok' : 'warn'} /> : <StatusChip label="Not measured" k="idle" />}>
      <Box sx={spaceSx}><TableCard cards={false} panel={false} className="space">
        <TableHead><TableRow><TableCell>Requirement</TableCell><TableCell align="right" className="num">Needed</TableCell><TableCell align="right" className="num">Available here</TableCell><TableCell>Result</TableCell></TableRow></TableHead>
        <TableBody>
          {SPACE.map(([k, l, u]) => {
            const rq = spaceReq(st, k); const a = av[k]; const has = a !== undefined && a !== ''; const ok = has && +a >= rq
            return (
              <TableRow key={k} className={!rq ? 'muted' : undefined} sx={!rq ? { color: 'var(--muted)', '& td': { color: 'var(--muted)', opacity: .55 } } : undefined}>
                <TableCell>{l}<div className="small muted">{u}</div></TableCell>
                <TableCell align="right" className="num" data-label="Needed"><TextInput grid={false} id={`sq-${k}`} type="number" min="0" defaultValue={rq} readOnly={slock} htmlInput={{ 'aria-label': `${l} needed` }} sx={numSx(false)} onChange={e => onSq(st, k, e.target.value)} /></TableCell>
                <TableCell align="right" className="num" data-label="Available here"><TextInput grid={false} id={`sa-${k}`} type="number" min="0" defaultValue={has ? a : ''} readOnly={slock} htmlInput={{ 'aria-label': `${l} available`, className: rq && !has ? 'needv' : undefined }} sx={numSx(rq && !has)} onChange={e => onSa(st, k, e.target.value)} /></TableCell>
                <TableCell>{!rq ? <span className="small muted">Not needed</span> : !has ? <span className="small muted">—</span> : ok ? <StatusChip label="Met" k="ok" /> : <StatusChip label={`Short by ${(rq - a).toLocaleString('en-IN')}`} k="bad" />}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </TableCard></Box>
      <Box sx={{ px: 2, py: 1.75, '@media (max-width:760px)': { p: 1.5 } }}>
        <TextInput grid={false} id="sp-other" label="Other requirements and fit-out notes" multiline readOnly={slock} defaultValue={st.otherReq || ''} sx={{ width: '100%' }}
          placeholder="False ceiling height, separate sample entry, ramp, lift size for analysers, drain near lab sinks…" onChange={e => onSd(st, 'otherReq', e.target.value, 'textarea')} />
      </Box>
    </Panel>
  )
}
