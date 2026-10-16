/* Confirmation video slot for one side of the inspection (prototype videoSlot + the data-ivideo change listener). */
import { useState } from 'react'
import { prop, isOwner, tenantOf } from '../../store/store'
import { inspLocked, inspOpen } from '../../domain/inspection'
import { fmtD, fmtDT } from '../../domain/utils'
import { fileUrl } from '../../services/files'
import { Btn } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { recordVideo } from './actions'

export default function VideoSlot({ I, who }) {
  const [busy, setBusy] = useState(false)
  const v = I[who + 'Video']; const P = prop(I.propertyId); const o = isOwner()
  const tn = tenantOf(P); const verb = I.kind === 'Move-in' ? 'taken over by ' + tn : 'handed back to me'
  const script = who === 'tdpl'
    ? `“I, ${I.inspector || '[name]'}, of ${tn}, inspected ${P?.name || 'the premises'} jointly with the owner today, ${fmtD(I.date)}. The condition of every item is as recorded in TruSpace.”`
    : `“I, ${I.ownerRep || '[owner name]'}, owner of ${P?.name || 'the premises'}, inspected the premises jointly with ${tn} today, ${fmtD(I.date)}, and confirm the premises are ${I.kind === 'Move-in' ? 'handed over to ' + tn : verb} in the condition recorded.”`
  const canEdit = I.status !== 'Signed' && (who === 'tdpl' ? (!o && !inspLocked(I)) : (I.status === 'Awaiting owner sign-off'))
  const onChange = async e => {
    const f = e.target.files?.[0]; if (!f) return
    try { await recordVideo(I, who, f, () => setBusy(true)) } finally { setBusy(false); e.target.value = '' }
  }
  return (
    <div className={`vslot ${v ? 'done' : 'need'}`}>
      <div className="ihead"><b>{who === 'tdpl' ? (P && P.managedBy === 'franchise' ? 'Franchise partner representative' : 'TrustLab employee') : 'Owner / representative'}</b>{v ? <StatusChip label="Recorded" k="ok" /> : <StatusChip label="Required" k="bad" />}</div>
      <p className="small muted" style={{ margin: 0 }}>Say on camera, showing the premises behind you:</p><p className="script">{script}</p>
      {v ? <><video controls playsInline preload="metadata" src={fileUrl(v)} /><div className="small muted">{v.by || ''} · {fmtDT(v.at)} · {Math.round(v.dur || 0)} s · {(v.size / 1e6).toFixed(1)} MB</div></> : null}
      {canEdit ? (
        <Btn component="label" primary={!v} sm={!!v}>
          {busy ? 'Uploading video…' : v ? 'Record again' : 'Record video'}
          <input type="file" accept="video/*" capture={who === 'owner' ? 'user' : 'environment'} hidden onChange={onChange} />
        </Btn>
      ) : (!v && who === 'owner' && inspOpen(I) ? <span className="small muted">Recorded at sign-off, after {tn} submits the inspection.</span> : null)}
    </div>
  )
}
