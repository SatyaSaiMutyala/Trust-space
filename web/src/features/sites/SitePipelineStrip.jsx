/* Site pipeline strip on the overview (prototype sitePipelineStrip). Returns null when there are no sites or the user is a franchisee. */
import Box from '@mui/material/Box'
import { S, useStore, isFranchisee, go } from '../../store/store'
import { siteStage, isFr } from '../../domain/site'
import { SITE_STAGES, IN_PROG } from '../../domain/constants'
import { Panel, Btn } from '../../components/ui/Layout'

export default function SitePipelineStrip() {
  useStore()
  if (!S.sites.length || isFranchisee()) return null
  const counts = SITE_STAGES.slice(0, 5).map(s => [s, S.sites.filter(st => siteStage(st) === s).length]).concat([['Franchise in assessment', S.sites.filter(st => isFr(st) && IN_PROG.slice(0, 5).includes(siteStage(st))).length]])
  return (
    <Panel title="Site pipeline" actions={<Btn sm onClick={() => go('sites')}>Open site scouting</Btn>}>
      <Box className="pipe" sx={{ '@media (min-width:561px) and (max-width:900px)': { gridTemplateColumns: 'repeat(3,minmax(0,1fr))', rowGap: 1.5 } }}>{counts.map(([s, n]) => <div key={s}><span className="v">{n}</span><span className="small muted">{s}</span></div>)}</Box>
    </Panel>
  )
}
