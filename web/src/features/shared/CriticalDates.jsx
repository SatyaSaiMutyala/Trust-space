/* Critical dates list — port of criticalDates (reference/TruSpace.html). Props: { days, pid } */
import { useStore } from '../../store/store'
import { criticalEvents } from '../../domain/lease'
import { daysTo, fmtD } from '../../domain/utils'

export default function CriticalDates({ days, pid }) {
  useStore()
  const list = criticalEvents(days, pid)
  if (!list.length) return <div className="empty">Nothing due in the next {days} days.</div>
  return (
    <div className="list">
      {list.map((e, i) => {
        const dd = daysTo(e.d)
        return (
          <div className="li" key={i}>
            <span className={`when ${dd <= 30 ? 'soon' : ''}`}>{dd < 0 ? Math.abs(dd) + 'd ago' : dd === 0 ? 'today' : 'in ' + dd + 'd'}</span>
            <div className="grow"><div>{e.t}</div><div className="small muted">{pid ? '' : (e.p?.name || '') + ' · '}{fmtD(e.d)}</div></div>
          </div>
        )
      })}
    </div>
  )
}
