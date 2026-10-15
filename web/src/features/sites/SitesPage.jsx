/*
 * Site scouting / My locations (prototype viewSites).
 * The List view is a server-side list (GET /api/sites): search, requirement, stage, purpose and city filters, a
 * “Scouted” date range and pagination. Its requirement and purpose filters stay in step with the page's own
 * requirement / “Setting up” selection; the location and engagement selections narrow it to their requirements.
 * The Pipeline board and Compare views need every site, so they keep using S.sites.
 */
import { useEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, UI, useStore, isFranchisee, frScope, setFilt } from '../../store/store'
import { openSite } from '../../store/actions'
import { reqOf, reqLoc, siteLoc, siteStage, reqState, siteScore, rentPsf, catchIndex, isFr } from '../../domain/site'
import { SITE_STAGES, FR_STAGES, IN_PROG, SITE_PURPOSE, verdictK } from '../../domain/constants'
import { inr, fmtD, by } from '../../domain/utils'
import { PageHead, Btn, TableCard, ClickRow, Empty } from '../../components/ui/Layout'
import { StatusChip, Badge, Seg } from '../../components/ui/Status'
import { SelectInput } from '../../components/form/Fields'
import { SampleBanner } from '../../components/app/Banners'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import { TableSkeleton, Refreshing } from '../../components/ui/Skeletons'
import SiteCard from './SiteCard'
import ReqCard from './ReqCard'
import CompareSites from './CompareSites'
import { siteMode, newReq, newSite, partners, reqFilter } from './actions'

/* Phones: columns hug their cards (no tall empty columns) and snap one column at a time. */
const boardSx = { '@media (max-width:760px)': { alignItems: 'start', scrollSnapType: 'x mandatory', scrollPaddingInline: '2px', '& > .bcol': { scrollSnapAlign: 'start' } } }
/* View switch: full-height touch targets on touch screens. */
const viewBarSx = { justifyContent: 'space-between', '@media (pointer:coarse)': { '& button': { minHeight: 40 } } }

const NumCell = ({ children }) => <TableCell className="num" sx={{ fontFamily: 'var(--f-mono)' }}>{children}</TableCell>
const NW = { whiteSpace: 'nowrap' }

/** Stage values stored on a site (the API's allowed values). Agreement → Operational are also derived from the lease on screen. */
const STAGES = SITE_STAGES.concat(['Opened', 'On hold', 'Rejected'])
/** reqId value that matches no site (a location / engagement without requirements). */
const NO_REQ = '__none__'

/**
 * Keep a list filter and a page filter (UI.filt.s) in step: whichever changed since the last render wins;
 * on the first render the page's selection leads. onList(value) applies a list-side change to the page.
 */
function useSyncedFilter(list, name, pageValue, onList) {
  const listValue = list.params.filters[name] || ''
  const seen = useRef(null)
  useEffect(() => {
    const prev = seen.current
    seen.current = { page: pageValue, list: listValue }
    if (pageValue === listValue) return
    if (prev && pageValue === prev.page && listValue !== prev.list) onList(listValue)
    else list.setFilter(name, pageValue)
  }) // eslint-disable-line react-hooks/exhaustive-deps
}

/** List view: server-side table of sites. */
function SitesTable({ f, fs, modelOk }) {
  // Location / engagement selections narrow the list to their requirements (unless one requirement is chosen).
  const ctxReqs = S.reqs.filter(r => (!fs || fs.has(r.id)) && modelOk(r) && (!f.loc || reqLoc(r) === f.loc))
  const fixed = !f.req && (f.loc || f.model) ? { reqId: ctxReqs.map(r => r.id).join(',') || NO_REQ } : {}
  const L = useServerList('sites', 'sites', { defaults: { limit: 10 }, fixed })
  useSyncedFilter(L, 'reqId', f.req || '', v => setFilt('s', v ? { req: v, loc: reqLoc(S.reqs.find(r => r.id === v)) } : { req: '' }))
  useSyncedFilter(L, 'purpose', f.purpose || '', v => setFilt('s', { purpose: v }))
  const reqOpts = ctxReqs.concat(f.req && !ctxReqs.some(r => r.id === f.req) ? S.reqs.filter(r => r.id === f.req) : [])
    .map(r => [r.id, `${r.code} · ${r.purpose}, ${r.area}`])
  const cities = [...new Set(S.sites.filter(st => !fs || fs.has(st.reqId)).map(st => (st.city || '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  return (
    <>
      <ListToolbar list={L} searchPlaceholder="Search site, code, locality, owner or broker" dateLabel="Scouted">
        <ListFilter list={L} name="reqId" label="Requirement" allLabel="All requirements" width={230} options={reqOpts} />
        <ListFilter list={L} name="stage" label="Stage" allLabel="Any stage" options={STAGES} />
        <ListFilter list={L} name="purpose" label="Purpose" allLabel="Any purpose" options={SITE_PURPOSE} />
        {cities.length > 1 ? <ListFilter list={L} name="city" label="City" allLabel="All cities" width={150} options={cities} /> : null}
      </ListToolbar>
      {!L.rows.length && L.isFetching ? <TableSkeleton rows={6} cols={10} /> : L.rows.length ? (
        <Refreshing on={L.isFetching}><TableCard>
          <TableHead>
            <TableRow>
              <TableCell>Site</TableCell><TableCell>Purpose</TableCell><NumCell>Area</NumCell><NumCell>Rent</NumCell><NumCell>₹/sq ft</NumCell><NumCell>Catchment</NumCell><NumCell>Checklist</NumCell><TableCell>Verdict</TableCell><TableCell>Stage</TableCell><TableCell>Scouted</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {L.rows.map(row => {
              const st = S.sites.find(x => x.id === row.id) || row
              const sc = siteScore(st); const psf = rentPsf(st); const ci = catchIndex(st); const stg = siteStage(st)
              return (
                <ClickRow key={st.id} onClick={() => openSite(st.id)}>
                  <TableCell sx={{ minWidth: 180 }}><b>{st.name}</b><div className="code">{st.code} · {st.locality}, {st.city}</div></TableCell>
                  <TableCell className="small">{st.purpose}</TableCell>
                  <NumCell>{(+(st.measuredArea || st.area) || 0).toLocaleString('en-IN')}</NumCell>
                  <NumCell>{inr(+(st.terms?.rent) || +st.quotedRent)}</NumCell>
                  <NumCell>{psf ? '₹' + psf.toFixed(0) : '—'}</NumCell>
                  <NumCell>{ci.filled ? ci.idx : '—'}</NumCell>
                  <NumCell>{sc.done ? sc.pct + '%' : '—'}</NumCell>
                  <TableCell sx={NW}><StatusChip label={sc.verdict} k={verdictK(sc.verdict)} /></TableCell>
                  <TableCell sx={NW}><StatusChip label={stg} k={stg === 'Rejected' ? 'bad' : stg === 'Operational' ? 'ok' : 'info'} /></TableCell>
                  <TableCell className="small" sx={NW}>{fmtD(st.scoutedOn)}<div className="muted">{st.scoutedBy || ''}</div></TableCell>
                </ClickRow>
              )
            })}
          </TableBody>
        </TableCard></Refreshing>
      ) : <Empty panel>{L.message || 'No sites found.'}</Empty>}
      <Pager list={L} />
    </>
  )
}

export default function SitesPage() {
  useStore()
  const f = UI.filt.s || {}; const mode = UI.siteMode || 'board'
  const fs = frScope(); const modelOk = q => !f.model || (f.model === 'Franchise' ? q?.model === 'Franchise' : q?.model !== 'Franchise')
  const list = S.sites.filter(st => (!fs || fs.has(st.reqId)) && modelOk(reqOf(st)) && (!f.loc || siteLoc(st) === f.loc) && (!f.req || st.reqId === f.req) && (!f.purpose || st.purpose === f.purpose))
  const locs = [...new Set(S.reqs.filter(r => !fs || fs.has(r.id)).map(reqLoc).concat(S.sites.filter(st => !fs || fs.has(st.reqId)).map(siteLoc)))].sort()
  const locCount = l => S.sites.filter(st => (!fs || fs.has(st.reqId)) && modelOk(reqOf(st)) && siteLoc(st) === l && IN_PROG.includes(siteStage(st))).length
  const reqs = S.reqs.filter(r => (!fs || fs.has(r.id)) && modelOk(r) && (!f.loc || reqLoc(r) === f.loc) && (!f.purpose || r.purpose === f.purpose)).sort((a, b) => (reqState(a).v === 'Finalised') - (reqState(b).v === 'Finalised') || (b.raisedOn || '').localeCompare(a.raisedOn || ''))
  const allInProg = S.sites.filter(st => (!fs || fs.has(st.reqId)) && modelOk(reqOf(st)) && IN_PROG.includes(siteStage(st))).length
  const fr = isFranchisee()
  const cols = SITE_STAGES.concat(['Opened', 'On hold', 'Rejected']).filter(c => !fr || FR_STAGES.concat(['On hold', 'Rejected']).includes(c))
  // The prototype builds the board first, then sorts `list` for the table; the compare view follows that sorted order.
  const boardList = list.slice()
  const sorted = list.sort(by('scoutedOn', -1))
  const cmpSites = sorted.filter(st => ['Shortlisted', 'Negotiation', 'Acceptance', 'Approved'].includes(siteStage(st)))
  const curReq = f.req ? S.reqs.find(r => r.id === f.req) : null
  const stats = [
    ['Requirements open', S.reqs.filter(r => (!fs || fs.has(r.id)) && modelOk(r) && (!f.loc || reqLoc(r) === f.loc) && !['Finalised', 'Cancelled'].includes(reqState(r).v)).length],
    ['Sites in progress', list.filter(st => IN_PROG.includes(siteStage(st))).length],
    ['Shortlisted or later', list.filter(st => ['Shortlisted', 'Negotiation', 'Acceptance', 'Approved'].includes(siteStage(st))).length],
    ['Finalised / approved', list.filter(st => ['Agreement', 'Take-over', 'Operational', 'Opened'].includes(siteStage(st)) || (isFr(st) && siteStage(st) === 'Approved')).length],
  ]

  const board = (
    <Box className="board" sx={boardSx}>
      {cols.map(c => {
        const items = boardList.filter(st => siteStage(st) === c)
        return (
          <div key={c} className={'bcol' + (['Rejected', 'On hold'].includes(c) ? ' dim' : '')}>
            <div className="bcol-h"><span>{c}</span><Badge n={items.length} /></div>
            {items.length ? items.map(st => <SiteCard key={st.id} st={st} />) : <div className="small muted" style={{ padding: 8 }}>—</div>}
          </div>
        )
      })}
    </Box>
  )

  return (
    <>
      {fr
        ? <><PageHead title="My locations" sub="Locations you are scouting for your TrustLab franchise. Add each site you find with photos and measurements, then submit it — TrustLab assesses it and approves or declines. Your lease with the owner is between you and the owner." actions={<Btn primary onClick={() => newSite()}>Add a location</Btn>} /></>
        : <PageHead title="Site scouting" sub="Start with a requirement — the location, what is being set up and whether TrustLab takes the lease or a franchise partner does — then log every site scouted against it." actions={<><Btn onClick={partners}>Franchise partners</Btn><Btn onClick={() => newSite()}>Add scouted site</Btn><Btn primary onClick={newReq}>New requirement</Btn></>} />}
      <SampleBanner />
      <div className="locbar">
        <SelectInput grid={false} id="sloc" label="Location" value={f.loc || ''} onChange={e => setFilt('s', { loc: e.target.value, req: '' })}
          options={[['', `All locations · ${allInProg} in progress`], ...locs.map(l => [l, `${l} · ${locCount(l)} in progress`])]} />
        {fr ? <div /> : <SelectInput grid={false} id="smodel" label="Engagement" value={f.model || ''} onChange={e => setFilt('s', { model: e.target.value, req: '' })}
          options={[['', 'TrustLab lease & franchise'], ['TrustLab lease', 'TrustLab lease only'], ['Franchise', 'Franchise only']]} />}
        <SelectInput grid={false} id="spurp" label="Setting up" value={f.purpose || ''} onChange={e => setFilt('s', { purpose: e.target.value })}
          options={[['', 'Any purpose'], ...SITE_PURPOSE]} />
        <div className="locstats">{stats.map(([l, v]) => <div key={l}><span className="v">{v}</span><span className="small muted">{l}</span></div>)}</div>
      </div>
      <section>
        <h2 style={{ marginBottom: 10 }}>Requirements{f.loc ? ' in ' + f.loc : ''}</h2>
        {reqs.length ? <div className="rcards">{reqs.map(r => <ReqCard key={r.id} r={r} />)}</div>
          : <Empty panel>No requirement for this location yet. <Btn sm primary onClick={newReq}>New requirement</Btn></Empty>}
      </section>
      <h2>{curReq ? `Sites for ${curReq.code} · ${curReq.purpose}, ${curReq.area}` : 'Scouted sites'}</h2>
      <Box className="filters" sx={viewBarSx}>
        <Seg role="tablist" itemRole="tab" ariaLabel="View" value={mode} onChange={siteMode}
          options={[['board', 'Pipeline'], ['table', 'List'], ['compare', `Compare shortlist (${cmpSites.length})`]]} />
        {curReq ? <Btn sm onClick={() => reqFilter(curReq.id)}>Show all sites</Btn> : null}
      </Box>
      {mode === 'board' ? board : mode === 'table' ? <SitesTable f={f} fs={fs} modelOk={modelOk} /> : <CompareSites list={cmpSites} />}
    </>
  )
}
