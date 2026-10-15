/* Side-by-side comparison of shortlisted sites (prototype compareSites). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { useStore } from '../../store/store'
import { openSite } from '../../store/actions'
import { siteScore, rentPsf, catchIndex, earthPlan, spaceStatus } from '../../domain/site'
import { SITE_CHECK, SOILS, verdictK } from '../../domain/constants'
import { inr } from '../../domain/utils'
import { fileUrl } from '../../services/files'
import { TableCard, ActLink, Empty } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'

const best = (vals, hi) => { const nums = vals.map(Number).filter(v => !isNaN(v) && v); const b = hi ? Math.max(...nums) : Math.min(...nums); return vals.map(v => +v === b && nums.length > 1) }

/* The row labels stay pinned while the site columns scroll sideways; on phones the label column narrows and each site keeps a readable width. */
const cmpSx = {
  '& table.cmp tr > :not(* ~ *)': { position: 'sticky', left: 0, zIndex: 2, bgcolor: 'var(--surface)', boxShadow: 'inset -1px 0 0 var(--line)' },
  '@media (max-width:600px)': {
    '& table.cmp th[scope=row]': { minWidth: 118, maxWidth: 132, fontSize: 12 },
    '& table.cmp tbody td, & table.cmp thead th:not(:not(* ~ *))': { minWidth: 168 },
  },
}

function Row({ label, vals, fmt, hi }) {
  const b = hi === undefined ? vals.map(() => false) : best(vals, hi)
  return (
    <TableRow>
      <TableCell component="th" scope="row">{label}</TableCell>
      {vals.map((v, i) => <TableCell key={i} className={b[i] ? 'bestc' : ''}>{fmt ? fmt(v, i) : v}</TableCell>)}
    </TableRow>
  )
}

export default function CompareSites({ list }) {
  useStore()
  if (!list.length) return <Empty panel>No sites are shortlisted yet. A site is shortlisted once its due-diligence checklist is complete with no critical failure.</Empty>
  const scs = list.map(siteScore)
  return (
    <>
      <TableCard cards={false} className="cmp" sx={cmpSx}>
        <TableHead>
          <TableRow>
            <TableCell />
            {list.map(st => <TableCell key={st.id}><ActLink onClick={() => openSite(st.id)}>{st.name}</ActLink><div className="code">{st.code}</div></TableCell>)}
          </TableRow>
        </TableHead>
        <TableBody>
          <Row label="Locality" vals={list.map(st => `${st.locality}, ${st.city}`)} />
          <Row label="Purpose / floor" vals={list.map(st => `${st.purpose} · ${st.floor || '—'}`)} />
          <Row label="Area (sq ft)" vals={list.map(st => +(st.measuredArea || st.area) || 0)} fmt={v => (+v).toLocaleString('en-IN')} hi />
          <Row label="Rent / month" vals={list.map(st => +(st.terms?.rent) || +st.quotedRent)} fmt={v => inr(v)} hi={false} />
          <Row label="Rent / sq ft" vals={list.map(st => rentPsf(st).toFixed(1))} fmt={v => '₹' + v} hi={false} />
          <Row label="Deposit" vals={list.map(st => +(st.terms?.deposit) || +st.quotedDeposit)} fmt={(v, i) => <>{inr(v)}{list[i].quotedRent ? <> <span className="small muted">({(v / (+(list[i].terms?.rent) || +list[i].quotedRent)).toFixed(1)} mo)</span></> : null}</>} hi={false} />
          <Row label="Hospitals within 3 km" vals={list.map(st => +(st.catch || {}).hosp3 || 0)} fmt={v => v} hi />
          <Row label="Clinics within 1 km" vals={list.map(st => +(st.catch || {}).clin1 || 0)} fmt={v => v} hi />
          <Row label="Residential units within 1 km" vals={list.map(st => +(st.catch || {}).res1 || 0)} fmt={v => (+v).toLocaleString('en-IN')} hi />
          <Row label="Competitors within 1 km" vals={list.map(st => +(st.catch || {}).comp1 || 0)} fmt={v => v} hi={false} />
          <Row label="Catchment index" vals={list.map(st => catchIndex(st).idx)} fmt={v => <><b>{v}</b>/100</>} hi />
          <Row label="Front view" vals={list.map(st => st.frontPhoto ? fileUrl(st.frontPhoto) : '')} fmt={v => v ? <img src={v} alt="" style={{ width: 120, height: 72, objectFit: 'cover', borderRadius: 5 }} /> : <span className="muted">—</span>} />
          <Row label="Name board" vals={list.map(st => st.sign?.loc ? `${st.sign.loc}${st.sign.w ? ` · ${st.sign.w}×${st.sign.h} ft` : ''}` : '—')} />
          <Row label="Board area (sq ft)" vals={list.map(st => (+st.sign?.w || 0) * (+st.sign?.h || 0))} fmt={v => v || '—'} hi />
          <Row label="Visible from" vals={list.map(st => st.sign?.vis || '—')} />
          <Row label="Soil" vals={list.map(st => st.earth?.soil || '—')} fmt={v => v === '—' ? v : <StatusChip label={v} k={SOILS[v]?.k} />} />
          <Row label="Existing earth resistance (Ω)" vals={list.map(st => st.earth?.resist ?? '')} fmt={v => v === '' ? '—' : v} hi={false} />
          <Row label="New earth pits possible" vals={list.map(st => +st.earth?.pitsPossible || 0)} fmt={(v, i) => <>{v} <span className="small muted">/ {earthPlan(list[i]).need} needed</span></>} hi />
          <Row label="Space needs met" vals={list.map(st => { const x = spaceStatus(st); return x.filled ? Math.round(x.met / x.need * 100) : 0 })} fmt={(v, i) => { const x = spaceStatus(list[i]); return x.filled ? <>{`${x.met}/${x.need}`}{x.short.length ? <div className="small muted">Short: {x.short.slice(0, 3).join(', ')}</div> : null}</> : '—' }} hi />
          <Row label="Checklist score" vals={scs.map(s => s.pct)} fmt={v => <b>{v}%</b>} hi />
          <Row label="Verdict" vals={scs.map(s => s.verdict)} fmt={v => <StatusChip label={v} k={verdictK(v)} />} />
          <Row label="Concerns" vals={scs.map(s => s.conc)} fmt={v => v} hi={false} />
          {SITE_CHECK.map(sec => <Row key={sec.s} label={sec.s} vals={scs.map(s => { const x = s.secs[sec.s]; return x && x.max ? Math.round(x.got / x.max * 100) : '' })} fmt={v => v === '' ? '—' : v + '%'} hi />)}
        </TableBody>
      </TableCard>
      <p className="small muted">Best value in each row is highlighted. Section scores weight critical items double.</p>
    </>
  )
}
