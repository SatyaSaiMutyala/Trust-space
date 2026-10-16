/* Property card — port of pcard + statusRows (reference/TruSpace.html). Props: { P } */
import { useStore, owner, role, isOwner, openProp } from '../../store/store'
import { CUR, inr } from '../../domain/utils'
import { leaseOf, leaseState, rentFor, frontOf, occStatus, rentStatus, repairStatus, ownersLabel, ownerShare, isMulti } from '../../domain/lease'
import { fileUrl } from '../../services/files'
import { StatusChip } from '../../components/ui/Status'
import { Facade } from '../../components/ui/Media'

function SRow({ l, x }) {
  return <div className="srow"><span className="sl">{l}</span><span><StatusChip label={x.v} k={x.k} /></span>{x.note ? <span className={`sn ${x.warn ? 'w' : ''}`}>{x.note}</span> : null}</div>
}

/** The three independent statuses of a property: occupancy, rent, repairs. */
export function StatusRows({ P }) {
  return <div className="srows"><SRow l="Status" x={occStatus(P)} /><SRow l="Rent" x={rentStatus(P)} /><SRow l="Repairs & maintenance" x={repairStatus(P)} /></div>
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
