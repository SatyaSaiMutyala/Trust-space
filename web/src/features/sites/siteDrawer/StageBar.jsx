/* stageBar(st): franchise banner, stage bar and the rejected / on-hold banner. */
import { useLayoutEffect, useRef } from 'react'
import { partner } from '../../../store/store'
import { siteStage, isFr, reqOf } from '../../../domain/site'
import { SITE_STAGES, FR_STAGES } from '../../../domain/constants'
import { Banner } from '../../../components/ui/Layout'

export default function StageBar({ st }) {
  const cur = siteStage(st)
  const ST = isFr(st) ? FR_STAGES : SITE_STAGES; const ix2 = ST.indexOf(cur)
  // On narrow screens the bar scrolls sideways: keep the current stage in view.
  const bar = useRef(null)
  useLayoutEffect(() => {
    const el = bar.current; const now = el?.querySelector('.sb.now')
    if (!el || !now || el.scrollWidth <= el.clientWidth) return
    el.scrollLeft = Math.max(0, now.offsetLeft - el.offsetLeft - (el.clientWidth - now.offsetWidth) / 2)
  }, [cur])
  return <>
    {isFr(st) ? <Banner className="banner frb"><b>Franchise location — assess only.</b> {partner(reqOf(st)?.partnerId)?.name || 'The franchise partner'} signs the lease with the owner. TrustLab is not a party to it, so no TrustLab lease, rent, ledger or handover is created.</Banner> : null}
    <div className="stagebar" ref={bar}>{ST.map((s, i) => <div key={s} className={`sb ${i < ix2 ? 'done' : i === ix2 ? 'now' : ''}`}>{s}</div>)}</div>
    {['Rejected', 'On hold'].includes(cur) ? <Banner tone="bad"><b>{cur}.</b> {st.rejectReason || st.holdReason || ''}</Banner> : null}
  </>
}
