/* One checklist item of an inspection (prototype itemHTML). Inputs are uncontrolled and live-save on change. */
import Box from '@mui/material/Box'
import { BADC, CONDS, condK } from '../../domain/constants'
import { inr } from '../../domain/utils'
import { Btn } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { Media, PhotoStrip, AddMedia } from '../../components/ui/Media'
import { TextInput, SelectInput } from '../../components/form/Fields'
import { icond, iphotoDel, ifixDel, itemField, addPhotos } from './actions'

const segSx = {
  display: 'flex', flexWrap: 'wrap', gap: '4px',
  '& button': { font: 'inherit', color: 'var(--ink)', border: '1px solid var(--line)', background: 'var(--surface)', borderRadius: '6px', p: '4px 10px', cursor: 'pointer', fontSize: 13, fontWeight: 500, minHeight: 30 },
  ...Object.fromEntries(['ok', 'warn', 'bad', 'idle'].map(k => [`& button.on.${k}`, { background: `var(--${k})`, borderColor: `var(--${k})`, color: '#fff' }])),
  '@media (pointer:coarse)': { '& button': { minHeight: 44 } },
  // Phones: all five choices on one row of equal, finger-sized cells ("Minor issue" may wrap inside its cell).
  '@media (max-width:760px)': { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(56px,1fr))', '& button': { p: '6px 2px', lineHeight: 1.2, whiteSpace: 'normal', fontSize: 12.5 } },
}

/** Condition choice (.seg): clicking the selected value again clears it. */
function CondSeg({ I, it }) {
  return (
    <Box className="seg" role="radiogroup" aria-label="Condition" sx={segSx}>
      {CONDS.map(c => <button key={c} type="button" role="radio" aria-checked={it.cond === c} className={it.cond === c ? 'on ' + condK(c) : ''} onClick={() => icond(I, it.k, c)}>{c}</button>)}
    </Box>
  )
}

export default function InspectItem({ I, it, locked }) {
  const bad = BADC(it.cond); const needPh = (it.req || bad) && it.cond !== 'N/A'
  const photos = it.photos || []
  const changed = it.prev && it.prev.cond && it.cond && it.prev.cond !== it.cond && it.cond !== 'N/A'
  const set = f => e => itemField(I, it.k, f, e.target.value)
  const aria = l => ({ 'aria-label': l })

  let ctl
  if (locked) {
    ctl = (
      <div className="filters">
        {it.cond ? <StatusChip label={it.cond} k={condK(it.cond)} /> : null}
        {it.val !== '' && it.val != null ? <span className="mono">{it.val}</span> : null}
        {it.type === 'fixture' ? <span className="small">Qty {it.qty || 1}</span> : null}
        {it.remark ? <span className="small">{it.remark}</span> : null}
        {I.kind === 'Move-out' && bad ? <span className="small"><b>{it.resp || ''}</b>{+it.deduct ? ' · ' + inr(it.deduct) : ''}</span> : null}
      </div>
    )
  } else {
    ctl = (
      <>
        {it.type === 'fixture' ? (
          <div className="filters">
            <TextInput grid={false} id={`ifl-${it.k}`} defaultValue={it.label} placeholder="e.g. Ceiling fans" readOnly={!!it.prev} onChange={set('label')} htmlInput={aria('Fixture name')} sx={{ width: 220, maxWidth: '100%' }} />
            <TextInput grid={false} id={`ifq-${it.k}`} type="number" defaultValue={it.qty ?? 1} min={0} onChange={set('qty')} htmlInput={aria('Quantity')} sx={{ width: 80 }} />
            {it.prev ? null : <Btn sm ghost onClick={() => ifixDel(I, it.k)}>Remove</Btn>}
          </div>
        ) : null}
        {it.type === 'cond' || it.type === 'fixture' ? <CondSeg I={I} it={it} /> : null}
        {it.type === 'count' || it.type === 'reading' ? <TextInput grid={false} id={`iv-${it.k}`} defaultValue={it.val} inputMode="decimal" placeholder={it.type === 'count' ? 'Number' : 'Reading'} onChange={set('val')} htmlInput={aria(it.label)} sx={{ maxWidth: 180 }} /> : null}
        <TextInput grid={false} id={`ir-${it.k}`} defaultValue={it.remark} placeholder={bad ? 'Describe the issue (required)' : 'Remarks'} onChange={set('remark')} htmlInput={aria('Remarks')} sx={{ width: '100%' }} />
        {I.kind === 'Move-out' && bad ? (
          <div className="filters">
            <SelectInput grid={false} id={`irs-${it.k}`} defaultValue={it.resp || ''} onChange={set('resp')} sx={{ width: 'auto', maxWidth: '100%', '@media (max-width:600px)': { '&&': { flexBasis: '100%' } } }}
              options={[['', 'Who bears the cost?'], ['Fair wear & tear', 'Fair wear & tear — no deduction'], ['TrustLab', 'TrustLab — deduct from deposit'], ['Owner', 'Owner — pre-existing / owner scope']]} />
            {it.resp === 'TrustLab' ? <TextInput grid={false} id={`ird-${it.k}`} type="number" defaultValue={it.deduct || ''} placeholder="Agreed deduction ₹" min={0} onChange={set('deduct')} htmlInput={aria('Agreed deduction')} sx={{ width: 170 }} /> : null}
          </div>
        ) : null}
      </>
    )
  }

  return (
    <div className={`iitem ${needPh && !photos.length && !locked ? 'miss' : ''}`} id={`it-${it.k}`}>
      <div className="ihead"><b>{it.label || 'Fixture'}</b>{it.req ? <span className="req">Photo required</span> : null}{changed ? <span className="chip c-bad">Changed since take-over</span> : null}</div>
      {it.prev ? (
        <div className="prev">
          <span className="eyebrow">At take-over</span> {it.prev.cond ? <StatusChip label={it.prev.cond} k={condK(it.prev.cond)} /> : null} {it.prev.val !== '' && it.prev.val != null ? <span className="mono">{it.prev.val}</span> : null} <span className="small muted">{it.prev.remark || ''}</span>
          {(it.prev.photos || []).length ? <PhotoStrip files={it.prev.photos} /> : null}
        </div>
      ) : null}
      {ctl}
      <div className="photos">
        {photos.map((f, ix) => (
          <span className="pwrap" key={f.id || ix}><Media f={f} alt={it.label} />{locked ? null : <button type="button" className="px" onClick={() => iphotoDel(I, it.k, ix)} aria-label="Remove photo">×</button>}</span>
        ))}
        {locked ? null : <>
          <AddMedia need={needPh && !photos.length} onFiles={fl => addPhotos(I, it.k, fl)} />
          <AddMedia video onFiles={fl => addPhotos(I, it.k, fl)} />
        </>}
      </div>
    </div>
  )
}
