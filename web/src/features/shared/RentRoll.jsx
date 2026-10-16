/* Rent roll grid — port of rollGrid (prototype). Props: { leases, months = 7 } */
import { useStore, prop, openProp, isOwner, role } from '../../store/store'
import { openInv, newInvoice, rentMonth } from '../../store/actions'
import { CUR, perAdd, perLabel, inr } from '../../domain/utils'
import { rentCell, rentFor, ownersLabel, ownerShare, isMulti, leaseOwners } from '../../domain/lease'
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
            <div><ActLink onClick={() => openProp(L.propertyId)}><b>{P?.name || '—'}</b></ActLink><div className="code">{P?.code} · {ownersLabel(L)}</div></div>
            {pers.map(p => {
              const c = rentCell(L, p); const t = c.k === 'na' ? '' : `${perLabel(p)}: ${TXT[c.k]}`; const tt = t + (c.multi ? ` · ${c.paid} of ${c.n} owners paid` : '')
              const act = c.multi && c.k !== 'na' && c.k !== 'free' ? () => rentMonth(L.id, p) : c.inv ? () => openInv(c.inv.id) : c.k === 'missing' ? () => newInvoice({ lease: L.id, period: p }) : null
              const tt2 = c.adjusted ? tt + ` · ${c.adjusted === c.n ? '' : c.adjusted + ' owner(s) '}settled from security deposit` : tt
              return <div key={p}><button type="button" className={`cell ${c.k} ${c.adjusted ? 'dep' : ''}`} onClick={act || undefined} tabIndex={act ? undefined : -1} title={tt2} aria-label={tt2}>{c.adjusted && c.k === 'paid' ? 'D' : c.multi && ['late', 'process'].includes(c.k) ? c.paid + '/' + c.n : LAB[c.k]}</button></div>
            })}
            <div className="num">{inr(isOwner() ? rentFor(L, CUR) * ownerShare(L, role().ownerId, 'rent') : rentFor(L, CUR))}{isMulti(L) && !isOwner() ? <div className="small muted">{leaseOwners(L).length} owners</div> : null}</div>
          </div>
        )
      })}
    </div></div>
  )
}
