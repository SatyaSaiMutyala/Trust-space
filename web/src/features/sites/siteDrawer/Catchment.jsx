/* Location & catchment assessment (data-sc). */
import { catchIndex, CATCH_MAX } from '../../../domain/site'
import { CATCH } from '../../../domain/constants'
import { Panel } from '../../../components/ui/Layout'
import { StatusChip, Ring, Progress } from '../../../components/ui/Status'
import { FormGrid, TextInput } from '../../../components/form/Fields'
import { onSc } from './siteActions'
import { H3 } from './parts'

export default function Catchment({ st, clock }) {
  const ci = catchIndex(st); const cc = st.catch || {}
  return (
    <Panel id="it-__catch" title={<H3>Location &amp; catchment assessment</H3>} sub="Count within the radius stated. Index out of 100: medical 30 · residential 30 · visibility 15 · competition 15 · corporate 10."
      actions={<div className="filters">{ci.filled ? <Ring pct={ci.idx} k={ci.idx >= 70 ? 'ok' : ci.idx >= 50 ? 'warn' : 'bad'} /> : <StatusChip label="Not assessed" k="idle" />}</div>}>
      <FormGrid>
        {CATCH.map(([k, l, h]) => <TextInput key={k} id={'ca-' + k} label={l} hint={h} type="number" min="0" defaultValue={cc[k] ?? ''} readOnly={clock} onChange={e => onSc(st, k, e.target.value)} />)}
        <TextInput id="ca-case" label="Why this location suits a diagnostics centre" multiline full readOnly={clock} defaultValue={cc.case || ''}
          placeholder="Referral sources, catchment profile (income, age mix), patient access, gaps competitors leave, B2B and home-collection reach" onChange={e => onSc(st, 'case', e.target.value)} />
      </FormGrid>
      {ci.filled ? <div className="catchbars">{Object.entries(ci.parts).map(([k, v]) => { const m = CATCH_MAX[k]; return <div key={k}><span className="small">{k}</span><Progress pct={v / m * 100} /><span className="small mono">{v}/{m}</span></div> })}</div> : null}
    </Panel>
  )
}
