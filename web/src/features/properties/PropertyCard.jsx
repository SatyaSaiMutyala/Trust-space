/* Property card — port of pcard + statusRows (reference/TruSpace.html). Props: { P } */
import { useStore, owner, role, isOwner, openProp } from '../../store/store'
import { CUR, inr, fmtD, daysTo } from '../../domain/utils'
import { leaseOf, leaseState, rentFor, frontOf, occStatus, repairStatus, ownersLabel, ownerShare, isMulti, noticeBy } from '../../domain/lease'
import { useRentStatus } from '../shared/useLedgerReports'
import { fileUrl } from '../../services/files'
import { StatusChip } from '../../components/ui/Status'
import { Facade } from '../../components/ui/Media'

function SRow({ l, x }) {
  return <div className="srow"><span className="sl">{l}</span><span><StatusChip label={x.v} k={x.k} className={x.cls || ''} /></span>{x.note ? <span className={`sn ${x.warn ? 'w' : ''}`}>{x.note}</span> : null}</div>
}

/** Notice-period status of the lease: days left to serve notice (red and blinking in the last week), served, or the deadline passed. */
function noticeStatus(P) {
  const L = leaseOf(P.id); if (!L || L.status === 'Draft' || ['Terminated', 'Expired'].includes(leaseState(L))) return null
  if (L.exit?.noticeDate) return { v: `Served ${fmtD(L.exit.noticeDate)}`, k: 'info', note: `Vacate by ${fmtD(L.exit.effective)}` }
  const by = noticeBy(L); const d = daysTo(by)
  if (d < 0) return { v: 'Deadline passed', k: 'bad', note: `Was ${fmtD(by)} · lease runs to ${fmtD(L.end)}` }
  if (d <= 7) return { v: d === 0 ? 'Serve today' : `${d} day${d > 1 ? 's' : ''} left`, k: 'bad', cls: 'blink', warn: true, note: `Serve notice by ${fmtD(by)}` }
  const left = d >= 60 ? `${Math.round(d / 30.44)} months left` : `${d} days left` // far-off deadlines read better in months
  return { v: left, k: d <= 30 ? 'warn' : 'ok', note: `Serve by ${fmtD(by)} · ${L.notice} months notice` }
}

/** The independent statuses of a property: occupancy, rent, repairs and the notice-period countdown. */
const LOADING = { v: '…', k: 'idle', note: '' }
export function StatusRows({ P }) {
  const ns = noticeStatus(P); const { byProperty } = useRentStatus()
  return <div className="srows"><SRow l="Status" x={occStatus(P)} /><SRow l="Rent" x={byProperty?.[P.id] || LOADING} /><SRow l="Repairs & maintenance" x={repairStatus(P)} />{ns ? <SRow l="Notice period" x={ns} /> : null}</div>
}

export default function PropertyCard({ P }) {
  useStore()
  const L = leaseOf(P.id); const ph = frontOf(P)
  return (
    <button type="button" className="pcard" onClick={() => openProp(P.id)}>
      <div className="ph">{ph ? <img src={fileUrl(ph)} alt={`Front view of ${P.name}`} /> : <Facade name={P.name} sub="" />}<span className="ptype">{P.type}{ph ? '' : ' · no photo yet'}</span></div>
      <div className="pb">
        <div className="code">{P.code}</div>
        <h3>{P.name}</h3>
        <div className="small muted">{P.city} · {(+P.area || 0).toLocaleString('en-IN')} sq ft · {L ? ownersLabel(L) : owner(P.ownerId)?.name || 'Owner not set'}{L && !['Draft', 'Terminated'].includes(leaseState(L)) ? <> · <span className="mono">{inr(isOwner() ? rentFor(L, CUR) * ownerShare(L, role().ownerId, 'rent') : rentFor(L, CUR))}</span>/mo{isOwner() && isMulti(L) ? ' (your share)' : ''}</> : null}</div>
        <StatusRows P={P} />
      </div>
    </button>
  )
}
