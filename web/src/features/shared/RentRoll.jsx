/* Rent roll grid — port of rollGrid (reference/TruSpace.html). Props: { leases, months = 7 } */
import { useStore, prop, owner, openProp } from '../../store/store'
import { openInv, newInvoice } from '../../store/actions'
import { CUR, perAdd, perLabel, inr } from '../../domain/utils'
import { rentCell, rentFor } from '../../domain/lease'
import { ActLink } from '../../components/ui/Layout'

const LAB = { paid: '✓', process: '…', late: '!', missing: '—', upcoming: '', na: '', free: 'RF' }
const TXT = { paid: 'Paid', process: 'Invoice in process', late: 'Invoiced, overdue', missing: 'Rent due, not invoiced', upcoming: 'Upcoming', free: 'Rent-free / fully adjusted' }

export default function RentRoll({ leases, months = 7 }) {
  useStore()
  if (!leases.length) return <div className="empty">No running leases yet. Add a property and its lease to start the rent roll.</div>
  const pers = []; for (let k = -(months - 2); k <= 1; k++) pers.push(perAdd(CUR, k))
  return (
    <div className="tbl-wrap"><div className="roll" style={{ '--m': pers.length, minWidth: `${200 + pers.length * 62 + 110}px` }}>
      <div className="row head"><div>Property / lease</div>{pers.map(p => <div key={p} style={{ textAlign: 'center' }}>{perLabel(p)}{p === CUR ? ' •' : ''}</div>)}<div className="num">Rent {perLabel(CUR)}</div></div>
      {leases.map(L => {
        const P = prop(L.propertyId)
        return (
          <div className="row" key={L.id}>
            <div><ActLink onClick={() => openProp(L.propertyId)}><b>{P?.name || '—'}</b></ActLink><div className="code">{P?.code} · {owner(L.ownerId)?.name || ''}</div></div>
            {pers.map(p => {
              const c = rentCell(L, p); const t = c.k === 'na' ? '' : `${perLabel(p)}: ${TXT[c.k]}`
              const act = c.inv ? () => openInv(c.inv.id) : c.k === 'missing' ? () => newInvoice({ lease: L.id, period: p }) : null
              return <div key={p}><button type="button" className={`cell ${c.k}`} onClick={act || undefined} tabIndex={act ? undefined : -1} title={t} aria-label={t}>{LAB[c.k]}</button></div>
            })}
            <div className="num">{inr(rentFor(L, CUR))}</div>
          </div>
        )
      })}
    </div></div>
  )
}
