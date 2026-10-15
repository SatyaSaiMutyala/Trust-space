/* Requirement card on the site scouting page (prototype reqCard). */
import { S, UI, useStore, partner, isFranchisee } from '../../store/store'
import { openSite } from '../../store/actions'
import { reqState, siteStage, siteScore } from '../../domain/site'
import { IN_PROG } from '../../domain/constants'
import { inr, fmtD } from '../../domain/utils'
import { StatusChip } from '../../components/ui/Status'
import { Btn, ActLink } from '../../components/ui/Layout'
import { reqFilter, newSite, editReq } from './actions'

export default function ReqCard({ r }) {
  useStore()
  const sites = S.sites.filter(st => st.reqId === r.id); const rs = reqState(r)
  const inprog = sites.filter(st => IN_PROG.includes(siteStage(st))).length
  const by = s => sites.filter(x => siteStage(x) === s).length
  const best = sites.filter(st => IN_PROG.includes(siteStage(st))).map(st => ({ st, sc: siteScore(st).pct })).sort((a, b) => b.sc - a.sc)[0]
  const sel = UI.filt.s?.req === r.id
  return (
    <div className={'rcard' + (sel ? ' sel' : '')}>
      <div className="rcard-h">
        <div style={{ minWidth: 0 }}>
          <div className="code">{r.code} · {r.priority || 'Normal'} priority</div>
          <b>{r.purpose}</b>{r.model === 'Franchise' ? <> <span className="chip c-warn frchip">Franchise</span></> : null}
          <div className="small">{r.area}, {r.city}</div>
          {r.model === 'Franchise' ? <div className="small muted">{partner(r.partnerId)?.name || ''} · {r.scoutBy === 'TrustLab' ? 'TrustLab scouts' : r.scoutBy === 'Both' ? 'both scout' : 'partner scouts'}, TrustLab assesses</div> : null}
        </div>
        <StatusChip label={rs.v} k={rs.k} />
      </div>
      <p className="small muted rwhy">{r.reason || ''}</p>
      <div className="small">{r.areaMin || r.areaMax ? `${(+r.areaMin || 0).toLocaleString('en-IN')}–${(+r.areaMax || 0).toLocaleString('en-IN')} sq ft` : ''}{r.rentMax ? ` · rent ≤ ${inr(r.rentMax)}` : ''}{r.target ? ` · open by ${fmtD(r.target)}` : ''}</div>
      <div className="rcount"><span><b>{sites.length}</b> sites</span><span><b>{inprog}</b> in progress</span><span><b>{by('Shortlisted') + by('Negotiation') + by('Acceptance') + by('Approved')}</b> shortlisted+</span><span><b>{by('Rejected')}</b> rejected</span></div>
      {rs.fin ? <div className="small">Finalised: <ActLink onClick={() => openSite(rs.fin.id)}>{rs.fin.name}</ActLink></div>
        : best ? <div className="small">Leading: <ActLink onClick={() => openSite(best.st.id)}>{best.st.name}</ActLink> · {best.sc}%</div> : null}
      <div className="actions">
        <Btn sm onClick={() => reqFilter(r.id)}>{sel ? 'Show all' : 'Show sites'}</Btn>
        {rs.v === 'Finalised' || rs.v === 'Cancelled' ? null : <Btn sm primary onClick={() => newSite(r.id)}>Add scouted site</Btn>}
        {isFranchisee() ? null : <Btn sm ghost onClick={() => editReq(r.id)}>Edit</Btn>}
      </div>
    </div>
  )
}
