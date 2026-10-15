/* siteItemHTML(st, it, locked): one due-diligence checklist item. */
import Box from '@mui/material/Box'
import { SV, svK } from '../../../domain/constants'
import { StatusChip, Seg } from '../../../components/ui/Status'
import { TextInput } from '../../../components/form/Fields'
import { scheck, onSk } from './siteActions'
import { SitePhotos } from './parts'

export default function SiteItem({ st, it, locked }) {
  const c = (st.checks || {})[it.k] || {}; const bad = ['Concern', 'Fail'].includes(c.v); const needPh = it.ph && c.v && c.v !== 'N/A' && !(c.photos || []).length
  return (
    <div className={`iitem ${needPh ? 'miss' : ''} ${c.v === 'Fail' && it.crit ? 'critfail' : ''}`} id={`it-${it.k}`}>
      <div className="ihead"><b>{it.label}</b>{it.crit ? <span className="req crit">Critical</span> : null}{it.ph ? <span className="req">Photo required</span> : null}</div>
      {locked
        ? <div className="filters">{c.v ? <StatusChip label={c.v} k={svK(c.v)} /> : <span className="muted small">Not assessed</span>}{c.remark ? <span className="small">{c.remark}</span> : null}</div>
        : <>
          <Box sx={{ '& button': { minHeight: '30px !important', padding: '4px 10px !important' }, '@media (max-width:760px)': { '& button': { minHeight: '44px !important', flex: '1 1 0', minWidth: 0 } } }}>
            <Seg ariaLabel="Result" options={SV.map(v => [v, v, svK(v)])} value={c.v} onChange={v => scheck(it.k, v)} />
          </Box>
          <TextInput grid={false} id={`sr-${it.k}`} defaultValue={c.remark || ''} placeholder={bad ? 'Explain (required)' : 'Remarks / measured value'} htmlInput={{ 'aria-label': 'Remarks' }} sx={{ width: '100%' }} onChange={e => onSk(st, it.k, e.target.value)} />
        </>}
      <SitePhotos st={st} k={it.k} files={c.photos} locked={locked} need={needPh} />
    </div>
  )
}
