/* Rent matrix: one row per lease year, one column per month (starting from the lease start month), plus the year total. */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableFooter from '@mui/material/TableFooter'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { TableCard } from '../../components/ui/Layout'
import { inr } from '../../domain/utils'

const monthName = p => new Date(+p.slice(0, 4), +p.slice(5, 7) - 1, 1).toLocaleDateString('en-IN', { month: 'short' })
const pct = (a, b) => String(+((a / b - 1) * 100).toFixed(1))

/** sc = schedule(L). Years run from the lease start month (e.g. Oct 2026 – Sep 2027). */
export default function RentByYear({ sc }) {
  const first = sc.rows[0]?.p
  if (!first) return null
  const months = sc.rows.slice(0, 12).map(r => monthName(r.p))
  let prev = null
  return (
    <TableCard cards={false} sx={{ '& .MuiTableCell-root': { px: 0.75, fontSize: 12 }, '& .MuiTableCell-root:first-of-type': { pl: 1.25 }, '& .MuiTableCell-root:last-of-type': { pr: 1.25 }, '& thead .MuiTableCell-root:first-of-type, & tbody .MuiTableCell-root:first-of-type': { position: 'sticky', left: 0, zIndex: 1, bgcolor: 'var(--surface)', borderRight: '1px solid var(--line)' } }}>
      <TableHead><TableRow>
        <TableCell>Year <span style={{ textTransform: 'none' }}>(₹)</span></TableCell>
        {months.map((m, i) => <TableCell key={i} className="num">{m}</TableCell>)}
        <TableCell className="num">Year total</TableCell>
      </TableRow></TableHead>
      <TableBody>
        {sc.years.map(y => {
          const yr = sc.rows.filter(r => r.y === y.y)
          let inc = null
          const cells = yr.map(r => {
            const up = r.ch && prev && r.rate !== prev
            if (up) inc = pct(r.rate, prev)
            if (r.ch) prev = r.rate
            const title = !r.ch ? 'Rent-free' : r.ch < r.D ? `Part month · ${r.ch}/${r.D} days at ${inr(r.rate)}` : `${inr(r.rate)} per month`
            return (
              <TableCell key={r.p} className="num" title={title}
                sx={up ? { bgcolor: 'color-mix(in srgb,var(--ok) 12%,transparent)', fontWeight: 600 } : !r.ch || r.ch < r.D ? { color: 'var(--muted)' } : undefined}>
                {r.ch ? Math.round(r.rent).toLocaleString('en-IN') : 'Free'}
              </TableCell>
            )
          })
          while (cells.length < 12) cells.push(<TableCell key={'e' + cells.length} />)
          return (
            <TableRow key={y.y}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>
                <b>Year {y.y}</b>
                <div className="small muted">{y.from.slice(0, 4)}{y.to.slice(0, 4) !== y.from.slice(0, 4) ? '–' + y.to.slice(2, 4) : ''}{inc ? <span style={{ color: 'var(--ok)' }}> · +{inc}%</span> : null}</div>
              </TableCell>
              {cells}
              <TableCell className="num"><b>{inr(y.rent)}</b></TableCell>
            </TableRow>
          )
        })}
      </TableBody>
      <TableFooter><TableRow>
        <TableCell colSpan={13}><b>Whole term · {sc.tot.months} months</b> <span className="small muted">· green cell = month the escalation starts · grey = rent-free or part month (hover for details)</span></TableCell>
        <TableCell className="num"><b>{inr(sc.tot.rent)}</b></TableCell>
      </TableRow></TableFooter>
    </TableCard>
  )
}
