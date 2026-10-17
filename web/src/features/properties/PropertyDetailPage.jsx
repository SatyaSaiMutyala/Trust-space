/* Property detail — port of viewProperty (reference/TruSpace.html). */
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Box from '@mui/material/Box'
import { useStore, S, UI, isOwner, role, prop, owner, inScope, go, zoom, openConv, emit } from '../../store/store'
import { editProperty, newLease, newTicket, newInvoice } from '../../store/actions'
import { fmtD, pctLabel, daysTo, inr, CUR } from '../../domain/utils'
import { leaseOf, frontOf, occStatus, repairStatus, maskAcct, noticeAddrOf, bankState, isMulti, leaseOwners, leaseState, rentFor } from '../../domain/lease'
import { useRentStatus } from '../shared/useLedgerReports'
import { fileUrl } from '../../services/files'
import { Btn, PageHead, Panel, Facts, Cols, Empty } from '../../components/ui/Layout'
import { StatusChip, Badge } from '../../components/ui/Status'
import { Facade, PhotoStrip } from '../../components/ui/Media'
import { SampleBanner } from '../../components/app/Banners'
import CriticalDates from '../shared/CriticalDates'
import LeaseDetail from '../leases/LeaseDetail'
import LedgersBody from '../ledgers/LedgersBody'
import TicketTable from '../tickets/TicketTable'
import LeaseInspections from '../inspections/LeaseInspections'
import ThreadPanel from '../messages/ThreadPanel'
import ExitPanel from '../exits/ExitPanel'
import OwnersBlock from '../leases/OwnersBlock'
import OwnerHomePage from '../ownerPortal/OwnerHomePage'
import PropertiesPage from './PropertiesPage'

const TABS = [['summary', 'Summary'], ['lease', 'Lease'], ['contracts', 'Contracts'], ['ledger', 'Ledgers'], ['tickets', 'Repairs'], ['inspections', 'Inspections'], ['messages', 'Messages'], ['exit', 'Exit']]

/** Time left on the lease (to the vacate date once notice is served) as a status chip: { v, k } or null without a live lease. */
function leaseLeft(L) {
  if (!L || L.status === 'Draft') return null
  const st = leaseState(L); if (st === 'Terminated') return null
  const end = L.exit?.effective || L.end; const d = daysTo(end)
  if (d < 0) return { v: 'Expired', k: 'bad' }
  const a = new Date(), b = new Date(end + 'T00:00:00'); let m = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); if (b.getDate() < a.getDate()) m--
  const v = m >= 1 ? `${m} month${m > 1 ? 's' : ''} left` : `${d} day${d === 1 ? '' : 's'} left`
  return { v, k: m >= 6 ? 'ok' : m >= 3 ? 'warn' : 'bad', end }
}

/** One tile of the status strip under the property name: small label over a chip or value. */
function Stat({ label, children }) {
  return (
    <Box component="span" sx={{ display: 'inline-flex', flexDirection: 'column', gap: '5px', px: 1.5, py: 1, border: '1px solid var(--line)', borderRadius: '10px', bgcolor: 'var(--surface)', minWidth: 0 }}>
      <span className="eyebrow" style={{ fontSize: 10.5 }}>{label}</span>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap', color: 'var(--ink)', fontSize: 13.5, lineHeight: 1.5 }}>{children}</Box>
    </Box>
  )
}

/** Segmented tab bar: pills in a sunken track, the selected one raised. */
const TABS_SX = {
  minHeight: 0, borderBottom: 'none', bgcolor: 'var(--sunk)', borderRadius: '12px', p: '4px', width: 'fit-content', maxWidth: '100%',
  '& .MuiTabs-indicator': { display: 'none' },
  '& .MuiTab-root': { minHeight: 36, px: 2, py: 0.5, minWidth: 0, borderRadius: '9px', color: 'var(--muted)', fontWeight: 500, fontSize: 14, transition: 'background-color .15s, color .15s', '&:hover': { color: 'var(--ink)', bgcolor: 'color-mix(in srgb, var(--surface) 55%, transparent)' } },
  '& .MuiTab-root.Mui-selected': { color: 'var(--ink)', bgcolor: 'var(--surface)', fontWeight: 600, boxShadow: '0 1px 2px rgba(0,0,0,.08), 0 0 0 1px var(--line)' },
  '@media (max-width:760px)': { width: '100%', '& .MuiTab-root': { px: 1.5 } },
}

/** One owner's contact, tax and bank facts (prototype's owner card on the property summary). */
function ownerFacts(O, withName) {
  const bs = bankState(O)
  return [
    ...(withName ? [['Name', O.name], ['Type', O.kind]] : []), ['Mobile', O.phone || '—'],
    ['Emergency', [O.emergency?.name, O.emergency?.phone].filter(Boolean).join(' · ') || '—'],
    ['Email', O.email || '—'], ['Notices to', noticeAddrOf(O) || '—'],
    ['PAN', <span key="p" className="mono">{O.pan || '—'}</span>], ['GSTIN', <span key="g" className="mono">{O.gstin || 'Unregistered'}</span>],
    ['Bank', <>{O.bankName || O.bank || '—'} <span className="mono">{maskAcct(O.acctNo)}</span> <StatusChip label={bs[0]} k={bs[1]} /></>],
  ]
}

/** Co-owners: one card each — name, type, share of the rent, then the same facts as a sole owner. */
function CoOwnerCards({ L }) {
  const me = isOwner() ? role().ownerId : null
  return (
    <Box sx={{ display: 'grid', gap: 1.5 }}>
      {leaseOwners(L).map(x => {
        const O = owner(x.ownerId); if (!O) return null
        return (
          <Box key={x.ownerId} sx={{ border: '1px solid var(--line)', borderRadius: 'var(--r)', overflow: 'hidden' }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, px: 1.5, py: 1, bgcolor: 'var(--sunk)', borderBottom: '1px solid var(--line)' }}>
              <Box aria-hidden="true" sx={{ width: 28, height: 28, borderRadius: '50%', bgcolor: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700, flex: 'none' }}>{(O.name || '?').split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase()}</Box>
              <b>{O.name}</b><span className="small muted">{O.kind}</span>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.75 }}><StatusChip label={`${inr(Math.round(rentFor(L, CUR) * x.rent / 100))}/mo`} k="info" /><span className="small muted">{pctLabel(x.rent)}</span>{me === x.ownerId ? <StatusChip label="You" k="ok" /> : null}</Box>
            </Box>
            <Box sx={{ p: 1.5, '& .facts': { gridTemplateColumns: 'repeat(2,minmax(0,1fr))' }, '@media (max-width:600px)': { '& .facts': { gridTemplateColumns: '1fr' } } }}><Facts items={ownerFacts(O, false)} /></Box>
          </Box>
        )
      })}
    </Box>
  )
}

function Summary({ P }) {
  const O = owner(P.ownerId); const o = isOwner(); const fv = frontOf(P); const L = leaseOf(P.id)
  const multi = !!(L && isMulti(L))
  return (
    <>
      <Cols n={2}>
        <Panel title="Premises" actions={o ? null : <Btn sm onClick={() => editProperty(P.id)}>Edit</Btn>}>
          <Box sx={{ display: 'grid', gap: '14px', gridTemplateColumns: 'minmax(0,1fr)' }}>
            <div className="front">{fv ? <img src={fileUrl(fv)} alt="Front view" onClick={() => zoom(fileUrl(fv))} /> : <Facade name={P.name} />}</div>
            <PhotoStrip files={P.photos} empty="No other photos" />
            {P.earthing && P.earthing.soil ? <div className="small"><b>Earthing:</b> {P.earthing.soil} · {P.earthing.maintBy || 'maintenance owner not set'} · test before and after each monsoon{P.earthing.measuredOn ? ' · last reading ' + P.earthing.resist + ' Ω on ' + fmtD(P.earthing.measuredOn) : ''}</div> : null}
            {P.signage && P.signage.loc ? <div className="small"><b>Name board:</b> {P.signage.loc}{P.signage.w ? ` · ${P.signage.w} × ${P.signage.h} ft` : ''}{P.signage.lit ? ' · ' + P.signage.lit : ''}</div> : null}
            <Facts items={[
              ['Code', <span key="c" className="mono">{P.code}</span>], ['Type', P.type], ['Branch', P.branch], ['Area', (+P.area || 0).toLocaleString('en-IN') + ' sq ft'], ['Floors', P.floors],
              ['Electricity meter', <span key="m" className="mono">{P.meter || '—'}</span>], ['Address', `${P.address}, ${P.city}, ${P.state}`],
            ]} />
          </Box>
        </Panel>
        {/* Same height as the Premises card beside it: the panel takes the row height and its body scrolls when there are many co-owners. */}
        <Panel title={multi ? `Owners · ${leaseOwners(L).length} co-owners` : 'Owner'} sub={multi ? 'Each co-owner invoices and is paid separately — shares are in Co-owners & shares below' : null} actions={o ? null : <Btn sm onClick={() => openConv(P.id)}>Message</Btn>}
          body={false} sx={{ display: 'flex', flexDirection: 'column', height: 0, minHeight: '100%', '@media (max-width:900px)': { height: 'auto', minHeight: 0 } }}>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 2, py: 1.75, '@media (max-width:760px)': { p: 1.5 } }}>
            {multi ? <CoOwnerCards L={L} /> : O ? <Facts items={ownerFacts(O, true)} /> : <div className="facts"><span className="muted">No owner linked</span></div>}
          </Box>
        </Panel>
      </Cols>
      {L && isMulti(L) ? <Panel title="Co-owners & shares"><OwnersBlock L={L} heading={false} /></Panel> : null}
      <Panel title="Upcoming dates"><CriticalDates days={365} pid={P.id} /></Panel>
    </>
  )
}

export default function PropertyDetailPage() {
  useStore()
  const { byProperty } = useRentStatus()
  const P = prop(UI.sel)
  if (!P || !inScope({ propertyId: P.id })) { UI.route = isOwner() ? 'o-home' : 'properties'; return isOwner() ? <OwnerHomePage /> : <PropertiesPage /> }
  const L = leaseOf(P.id); const tab = UI.tab; const o = isOwner()
  const occ = occStatus(P), rs = byProperty?.[P.id] || { v: '…', k: 'idle', note: '' }, rp = repairStatus(P), ll = leaseLeft(L)
  const openTickets = S.tickets.filter(t => t.propertyId === P.id && !['Resolved', 'Closed'].includes(t.status)).length
  let body = null
  if (tab === 'summary') body = <Summary P={P} />
  if (tab === 'lease') body = L ? <LeaseDetail L={L} /> : <Empty panel>No lease recorded. {o ? '' : <Btn primary onClick={() => newLease(P.id)}>Create lease</Btn>}</Empty>
  if (tab === 'contracts') body = <Empty panel>Contracts — coming soon. This tab will hold the property’s contracts and their documents.</Empty> // placeholder until the contracts module is specified
  if (tab === 'ledger') body = <LedgersBody fixedPid={P.id} />
  if (tab === 'tickets') body = <TicketTable list={S.tickets.filter(t => t.propertyId === P.id)} pid={P.id} />
  if (tab === 'messages') body = <ThreadPanel pid={P.id} />
  if (tab === 'inspections') body = L ? <LeaseInspections L={L} /> : <Empty panel>No lease — inspections are recorded against a lease.</Empty>
  if (tab === 'exit') body = L ? <ExitPanel L={L} /> : <Empty panel>No lease to exit.</Empty>
  return (
    <>
      <div><Btn ghost sm onClick={() => go(o ? 'o-home' : 'properties')}>← All properties</Btn></div>
      <PageHead
        title={P.name}
        subWide
        sub={<Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
          <Stat label="Premises"><span className="mono">{P.code}</span><span className="muted">·</span>{P.city}</Stat>
          <Stat label="Status"><StatusChip label={occ.v} k={occ.k} /></Stat>
          <Stat label="Rent"><StatusChip label={rs.v} k={rs.k} /></Stat>
          <Stat label="Repairs"><StatusChip label={rp.v} k={rp.k} /></Stat>
          {ll ? <Stat label="Lease"><StatusChip label={ll.v} k={ll.k} /><span className="small muted">ends {fmtD(ll.end)}</span></Stat> : null}
        </Box>}
        actions={o
          ? <><Btn onClick={() => newTicket(P.id)}>Report an issue</Btn><Btn primary onClick={() => newInvoice({ prop: P.id })}>Raise invoice</Btn></>
          : <><Btn onClick={() => newTicket(P.id)}>New ticket</Btn><Btn onClick={() => newInvoice({ prop: P.id })}>Record invoice</Btn></>}
      />
      <SampleBanner />
      <Tabs value={TABS.some(([k]) => k === tab) ? tab : false} onChange={(e, v) => { UI.tab = v; emit() }} variant="scrollable" scrollButtons={false} sx={TABS_SX}>
        {TABS.map(([k, l]) => <Tab key={k} value={k} disableRipple label={k === 'tickets' && openTickets ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{l}<Badge n={openTickets} hot /></span> : l} />)}
      </Tabs>
      {body}
    </>
  )
}
