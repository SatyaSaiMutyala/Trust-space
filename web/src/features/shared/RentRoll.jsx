/* Rent roll grid — port of rollGrid (prototype). Props: { leases, months = 7 }. The cells come from the API (GET /api/rent-roll). */
import { useStore, prop, openProp, isOwner } from '../../store/store'
import { openInv, newInvoice, rentMonth } from '../../store/actions'
import { perLabel, inr } from '../../domain/utils'
import { ownersLabel, isMulti, leaseOwners } from '../../domain/lease'
import { ActLink } from '../../components/ui/Layout'
import { TableSkeleton } from '../../components/ui/Skeletons'
import { useRentRoll } from './useLedgerReports'

const LAB = { paid: '✓', process: '…', late: '!', missing: '—', upcoming: '', na: '', free: 'RF' }
const TXT = { paid: 'Paid', process: 'Invoice in process', late: 'Invoiced, overdue', missing: 'Rent due, not invoiced', upcoming: 'Upcoming', free: 'Rent-free / fully adjusted' }
const NA = { k: 'na', n: 0, paid: 0, multi: false, out: 0, amt: 0, adjusted: 0, inv: null }

export default function RentRoll({ leases, months = 7 }) {
  useStore()
  const { roll } = useRentRoll(months)
  if (!leases.length) return <div className="empty">No running leases yet. Add a property and its lease to start the rent roll.</div>
  if (!roll) return <TableSkeleton rows={Math.min(leases.length, 6)} cols={months + 2} panel={false} />
  const pers = roll.periods, CUR = roll.cur; const byLease = Object.fromEntries(roll.leases.map(l => [l.leaseId, l]))
  return (
    <div className="tbl-wrap"><div className="roll" style={{ '--m': pers.length, minWidth: `${200 + pers.length * 62 + 110}px` }}>
      <div className="row head"><div>Property / lease</div>{pers.map(p => <div key={p} style={{ textAlign: 'center' }}>{perLabel(p)}{p === CUR ? ' •' : ''}</div>)}<div className="num">Rent {perLabel(CUR)}</div></div>
      {leases.map(L => {
        const P = prop(L.propertyId); const rl = byLease[L.id]
        return (
          <div className="row" key={L.id}>
            <div><ActLink onClick={() => openProp(L.propertyId)}><b>{P?.name || '—'}</b></ActLink><div className="code">{P?.code} · {ownersLabel(L)}</div></div>
            {pers.map(p => {
              const c = rl?.cells[p] || NA; const t = c.k === 'na' ? '' : `${perLabel(p)}: ${TXT[c.k]}`; const tt = t + (c.multi ? ` · ${c.paid} of ${c.n} owners paid` : '')
              const act = c.multi && c.k !== 'na' && c.k !== 'free' ? () => rentMonth(L.id, p) : c.inv ? () => openInv(c.inv) : c.k === 'missing' ? () => newInvoice({ lease: L.id, period: p }) : null
              const tt2 = c.adjusted ? tt + ` · ${c.adjusted === c.n ? '' : c.adjusted + ' owner(s) '}settled from security deposit` : tt
              return <div key={p}><button type="button" className={`cell ${c.k} ${c.adjusted ? 'dep' : ''}`} onClick={act || undefined} tabIndex={act ? undefined : -1} title={tt2} aria-label={tt2}>{c.adjusted && c.k === 'paid' ? 'D' : c.multi && ['late', 'process'].includes(c.k) ? c.paid + '/' + c.n : LAB[c.k]}</button></div>
            })}
            <div className="num">{inr(rl?.rentNow || 0)}{isMulti(L) && !isOwner() ? <div className="small muted">{leaseOwners(L).length} owners</div> : null}</div>
          </div>
        )
      })}
    </div></div>
  )
}
