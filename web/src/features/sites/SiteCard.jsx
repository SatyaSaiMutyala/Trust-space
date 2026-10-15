/* Pipeline card for one scouted site (prototype siteCard). */
import { useStore } from '../../store/store'
import { openSite } from '../../store/actions'
import { siteScore, rentPsf, isFr, catchIndex } from '../../domain/site'
import { verdictK } from '../../domain/constants'
import { inr } from '../../domain/utils'
import { fileUrl } from '../../services/files'
import { StatusChip, Ring } from '../../components/ui/Status'

export default function SiteCard({ st }) {
  useStore()
  const sc = siteScore(st); const psf = rentPsf(st); const ci = catchIndex(st)
  return (
    <button type="button" className="scard" onClick={() => openSite(st.id)}>
      {st.frontPhoto ? <img className="sthumb" src={fileUrl(st.frontPhoto)} alt="" /> : null}
      <div className="scard-h">
        <div style={{ minWidth: 0 }}>
          <div className="code">{st.code}{isFr(st) ? <> · <span className="frtag">Franchise</span></> : null}</div>
          <b>{st.name}</b>
          <div className="small muted">{st.locality}, {st.city}</div>
        </div>
        <Ring pct={sc.pct} k={verdictK(sc.verdict)} />
      </div>
      <div className="small">{st.purpose} · {(+(st.measuredArea || st.area) || 0).toLocaleString('en-IN')} sq ft{st.floor ? ' · ' + st.floor : ''}</div>
      <div className="small mono">{inr(+(st.terms?.rent) || +st.quotedRent)}/mo{psf ? ' · ₹' + psf.toFixed(0) + '/sq ft' : ''}</div>
      {ci.filled ? <div className="small">Catchment <b>{ci.idx}</b>/100 · {+(st.catch.hosp3) || 0} hospitals · {(+(st.catch.res1) || 0).toLocaleString('en-IN')} homes</div> : null}
      <div className="filters"><StatusChip label={sc.verdict} k={verdictK(sc.verdict)} />{sc.crit.length ? <span className="chip c-bad">{sc.crit.length} critical fail</span> : null}<span className="small muted">{sc.done}/{sc.total} checked</span></div>
    </button>
  )
}
