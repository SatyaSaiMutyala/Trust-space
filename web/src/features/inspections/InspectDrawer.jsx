/* Joint inspection drawer (prototype DRAWERS.inspect + inspHTML). Live-saving: every change mutates the record and calls saveInsp. */
import { useLayoutEffect, useRef } from 'react'
import Box from '@mui/material/Box'
import { S, prop, owner, useStore, isOwner, tenantOf, closeDrawer } from '../../store/store'
import { inspProblems, inspLocked, inspSummary } from '../../domain/inspection'
import { CHECK, FIX_SEC, IN_KIND, inspStatusK } from '../../domain/constants'
import { fmtD, fmtDT, inr } from '../../domain/utils'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn, Panel, Banner, Facts } from '../../components/ui/Layout'
import { StatusChip, Progress, Timeline, ConfirmButton } from '../../components/ui/Status'
import { Media, PhotoStrip, AddMedia } from '../../components/ui/Media'
import { FormGrid, TextInput } from '../../components/form/Fields'
import InspectItem from './InspectItem'
import VideoSlot from './VideoSlot'
import SignControls from './SignControls'
import { headField, iphotoDel, ifixAdd, addPhotos, dlInsp, delInsp } from './actions'

const SECS = [...CHECK.map(c => c.s), FIX_SEC]
const statusChip = I => <StatusChip label={I.status} k={inspStatusK(I.status)} />

/** Progress strip that sticks just below the drawer header (prototype .ibar with top: var(--dh)). */
function IBar({ children }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current; const h = el?.closest('.MuiDrawer-paper')?.querySelector('header'); if (!h) return
    const set = () => { el.style.top = h.offsetHeight + 'px' }
    set(); const ro = new ResizeObserver(set); ro.observe(h); return () => ro.disconnect()
  }, [])
  return <div className="ibar" ref={ref} style={{ zIndex: 1 }}>{children}</div>
}

function Sign({ s, who }) {
  return s
    ? <div className="sig"><span className="eyebrow">{who}</span><b>{s.name}</b><span className="small muted">{fmtDT(s.at)}{s.method ? ' · ' + s.method : ''}</span></div>
    : <div className="sig pending"><span className="eyebrow">{who}</span><span className="muted">Not signed</span></div>
}

/** Section chips: finger-sized on touch screens; the strip scrolls sideways. */
const ijumpSx = { '&& a': { flex: 'none' }, '@media (pointer:coarse)': { '&& a': { display: 'inline-flex', alignItems: 'center', minHeight: 40, px: 1.5, fontSize: 13 } } }

const jump = id => e => { e.preventDefault(); document.getElementById(id)?.scrollIntoView() }

export default function InspectDrawer({ d }) {
  useStore()
  const I = S.inspections.find(x => x.id === d.id)
  if (!I) return <DrawerLayout title="Inspection"><div className="empty">Not found.</div></DrawerLayout>
  const P = prop(I.propertyId)
  const footer = <>
    <Btn onClick={() => dlInsp(I.id)}>Download report</Btn>
    {!isOwner() && I.status === 'In progress' ? <ConfirmButton onConfirm={() => delInsp(I.id)} /> : null}
    <Btn onClick={closeDrawer}>Close</Btn>
  </>
  return (
    <DrawerLayout title={`${IN_KIND[I.kind]} · ${P?.name || ''}`} sub={<><span className="mono">{P?.code || ''}</span> · joint inspection with {owner(I.ownerId)?.name || 'owner'} · {statusChip(I)}</>} footer={footer}>
      <InspBody I={I} P={P} />
    </DrawerLayout>
  )
}

function InspBody({ I, P }) {
  const locked = inspLocked(I) || isOwner(); const L = S.leases.find(l => l.id === I.leaseId)
  const probs = inspProblems(I); const total = I.items.length
  const done = I.items.filter(it => (it.type === 'count' || it.type === 'reading') ? String(it.val ?? '') !== '' : !!it.cond).length
  const { flagged, ded } = inspSummary(I)
  const room = I.roomPhotos || []
  const ih = f => e => headField(I, f, e.target.value)

  const headF = locked
    ? <Facts items={[['Inspection date', fmtD(I.date)], ['TrustLab inspector', I.inspector || '—'], ['Owner / representative', I.ownerRep || '—'], ['Lease', L?.ref || '']]} />
    : (
      <Box id="it-__head" sx={{ scrollMarginTop: '90px' }}>
        <FormGrid>
          <TextInput id="ih-d" type="date" label="Inspection date" defaultValue={I.date} onChange={ih('date')} />
          <TextInput id="ih-i" label={(P?.managedBy === 'franchise' ? 'Inspector for ' + tenantOf(P) : 'TrustLab inspector') + ' (name & designation)'} defaultValue={I.inspector} placeholder="e.g. R. Kumar, Facilities Executive" onChange={ih('inspector')} />
          <TextInput id="ih-o" label="Owner / authorised representative" defaultValue={I.ownerRep} onChange={ih('ownerRep')} />
          <TextInput id="ih-w" label="Present at inspection" defaultValue={I.present || ''} placeholder="Others present (optional)" onChange={ih('present')} />
        </FormGrid>
      </Box>
    )

  return <>
    <IBar>
      <Progress pct={Math.round(done / total * 100)} />
      <span className="small">{done}/{total} items recorded · {room.length} area photos · {flagged.length} issues{I.kind === 'Move-out' ? ` · deductions ${inr(ded)}` : ''}</span>
    </IBar>
    {I.status === 'Disputed' ? <Banner tone="bad"><b>Owner disputed this inspection:</b> {I.dispute || ''}</Banner> : null}
    <Panel>{headF}</Panel>
    <Box component="nav" className="ijump" aria-label="Sections" sx={ijumpSx}>
      {SECS.map((s, i) => <a key={s} href={`#isec-${i}`} onClick={jump(`isec-${i}`)}>{s}</a>)}
      <a href="#isec-room" onClick={jump('isec-room')}>Area photos</a><a href="#isec-vid" onClick={jump('isec-vid')}>Videos</a>
    </Box>
    {SECS.map((s, i) => {
      const its = I.items.filter(it => it.sec === s)
      return (
        <Panel key={s} className="isec" id={`isec-${i}`} title={<h3>{s}</h3>} actions={<span className="small muted">{its.filter(it => it.cond || String(it.val ?? '') !== '').length}/{its.length}</span>}>
          {its.length ? its.map(it => <InspectItem key={`${I.id}-${it.k}`} I={I} it={it} locked={locked} />) : (s === FIX_SEC ? <p className="small muted">List every owner-provided item (fans, lights, ACs, furniture, geysers, curtains…) with quantity.</p> : null)}
          {s === FIX_SEC && !locked ? <Btn sm onClick={() => ifixAdd(I)}>Add fixture</Btn> : null}
        </Panel>
      )
    })}
    <Panel className="isec" id="isec-room" title={<h3>Area-wise photos</h3>} actions={<span className="small muted">Minimum 4 — every room, washroom, terrace, frontage</span>}>
      <div id="it-__room">
        <div className="photos">
          {room.map((f, ix) => <span className="pwrap" key={f.id || ix}><Media f={f} alt="Area photo" />{locked ? null : <button type="button" className="px" onClick={() => iphotoDel(I, '__room', ix)} aria-label="Remove photo">×</button>}</span>)}
          {locked ? null : <>
            <AddMedia label="＋ Photos" need={room.length < 4} onFiles={fl => addPhotos(I, '__room', fl)} />
            <AddMedia video onFiles={fl => addPhotos(I, '__room', fl)} />
          </>}
        </div>
      </div>
    </Panel>
    <Panel className="isec" id="isec-vid" title={<h3>Video confirmations</h3>} sub="Mandatory. A short clip (5 seconds to 2 minutes) from each side, filmed at the premises.">
      <div className="vids" id="it-__vid"><VideoSlot I={I} who="tdpl" /><VideoSlot I={I} who="owner" /></div>
    </Panel>
    <Panel title={<h3>Joint sign-off</h3>} actions={statusChip(I)}>
      <Box sx={{ display: 'grid', gap: '14px' }}>
        <div className="sigs"><Sign s={I.tdplSign} who={'For ' + tenantOf(P)} /><Sign s={I.ownerSign} who="Owner / representative" /></div>
        <SignControls I={I} probs={probs} />
        {(I.paper || []).length ? <div><span className="eyebrow">Signed paper copy</span><PhotoStrip files={I.paper} /></div> : null}
        <Timeline entries={I.log || []} />
      </Box>
    </Panel>
  </>
}

