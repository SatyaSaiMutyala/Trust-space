/* Due-diligence checklist: section jump chips with % scores, deal-breaker banner and every item. */
import Box from '@mui/material/Box'
import { siteScore } from '../../../domain/site'
import { SITE_CHECK, SITE_ITEMS, verdictK } from '../../../domain/constants'
import { Panel, Banner } from '../../../components/ui/Layout'
import { StatusChip, Ring } from '../../../components/ui/Status'
import SiteItem from './SiteItem'
import { H3 } from './parts'

const jump = (e, id) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }) }

export default function Checklist({ st, locked }) {
  const sc = siteScore(st)
  return (
    <Panel title={<H3>Due-diligence checklist</H3>} sub={`${sc.done}/${sc.total} assessed · critical items count double · any critical Fail is a deal-breaker`}
      actions={<div className="filters"><Ring pct={sc.pct} k={verdictK(sc.verdict)} /><StatusChip label={sc.verdict} k={verdictK(sc.verdict)} /></div>}>
      <Box component="nav" className="ijump" aria-label="Sections" sx={{ '@media (pointer:coarse)': { '& a': { display: 'inline-flex', alignItems: 'center', minHeight: 36 } } }}>
        {SITE_CHECK.map((sec, i) => { const x = sc.secs[sec.s]; return <a key={sec.s} href={`#ssec-${i}`} onClick={e => jump(e, `ssec-${i}`)}>{sec.s}{x && x.max ? ' · ' + Math.round(x.got / x.max * 100) + '%' : ''}</a> })}
      </Box>
      {sc.crit.length ? <Banner tone="bad" sx={{ mt: 1.25 }}><b>Deal-breaker:</b> {sc.crit.map(it => it.label.split(' — ')[0]).join('; ')}. Fix with the owner and re-check, or reject the site.</Banner> : null}
      {SITE_CHECK.map((sec, i) => (
        <div className="isec" id={`ssec-${i}`} key={sec.s}>
          <h3 style={{ margin: '16px 0 4px' }}>{sec.s}</h3>
          {SITE_ITEMS.filter(it => it.sec === sec.s).map(it => <SiteItem key={it.k} st={st} it={it} locked={locked} />)}
        </div>
      ))}
    </Panel>
  )
}
