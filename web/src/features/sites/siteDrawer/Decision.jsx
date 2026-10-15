/* Decision sections: franchise approved / opened (with premises management), TrustLab approved → convert, agreement & handover. */
import { useState } from 'react'
import { S, ALL, partner, openProp } from '../../../store/store'
import { openLease, editLease } from '../../../store/actions'
import { reqOf } from '../../../domain/site'
import { leaseState } from '../../../domain/lease'
import { TODAY, fmtD } from '../../../domain/utils'
import { Panel, Btn } from '../../../components/ui/Layout'
import { StatusChip } from '../../../components/ui/Status'
import { FormGrid, TextInput, Cell } from '../../../components/form/Fields'
import InspectionActions from '../../inspections/InspectionActions'
import { frEnable, dlFrLetter, frManage, frOpen, siteConvert, onSd } from './siteActions'
import { H3 } from './parts'

/** Uncontrolled form that reads FormData and disables its submit while saving. */
function SForm({ onSubmit, children }) {
  const [busy, setBusy] = useState(false)
  return (
    <form onSubmit={async e => { e.preventDefault(); const fd = new FormData(e.currentTarget); setBusy(true); try { await onSubmit(fd) } finally { setBusy(false) } }}>
      <FormGrid>{typeof children === 'function' ? children(busy) : children}</FormGrid>
    </form>
  )
}

function Manage({ st, frU }) {
  const pa = partner(reqOf(st)?.partnerId)
  return (
    <Panel title={<H3>Manage these premises in TruSpace</H3>} sub="Optional. The franchise partner runs the lease, rent, owner invoices, inspections, repairs and exit here — in its own workspace, separate from TrustLab’s premises."
      actions={st.propertyId ? <StatusChip label="Set up" k="ok" /> : pa?.premisesMgmt ? <StatusChip label="Available" k="info" /> : <StatusChip label="Not enabled" k="idle" />}>
      {st.propertyId ? <>
        <p className="small" style={{ marginTop: 0 }}>Premises <b className="mono">{ALL.properties.find(p => p.id === st.propertyId)?.code || ''}</b> and lease {ALL.leases.find(l => l.id === st.leaseId)?.ref || ''} are in {pa?.name || 'the partner'}’s workspace.</p>
        {frU ? <div className="actions"><Btn onClick={() => openProp(st.propertyId)}>Open premises</Btn><Btn onClick={() => editLease(st.leaseId)}>Set up lease</Btn></div>
          : null}
      </> : pa?.premisesMgmt ? (
        <SForm onSubmit={fd => frManage(st.id, fd)}>{busy => <>
          <TextInput id="fm-code" name="code" label="Premises code" required placeholder="e.g. KMM-FR-LAB-01" />
          <TextInput id="fm-own" name="ownerName" label="Owner (landlord) name" required defaultValue={st.ownerName && !st.ownerName.startsWith('(') ? st.ownerName : ''} />
          <TextInput id="fm-oph" name="ownerPhone" label="Owner phone" type="tel" defaultValue={st.ownerPhone || ''} />
          <Cell full><Btn type="submit" primary disabled={busy}>Set up premises &amp; draft lease</Btn></Cell>
        </>}</SForm>
      ) : frU ? <p className="small muted" style={{ margin: 0 }}>Ask TrustLab to enable premises management for your account.</p>
        : <Btn sm onClick={() => frEnable(pa?.id)}>Enable for {pa?.name || 'partner'}</Btn>}
    </Panel>
  )
}

export default function Decision({ st, stage, fr, frU }) {
  if (fr && ['Approved', 'Opened'].includes(stage)) {
    const opened = stage === 'Opened'
    return <>
      <Manage st={st} frU={frU} />
      <Panel title={<H3>{opened ? 'Franchise centre opened' : 'Location approved for franchise'}</H3>} actions={<StatusChip label={opened ? 'Opened ' + fmtD(st.openedOn) : 'Approved ' + fmtD(st.approval?.at)} k="ok" />}>
        <div style={{ display: 'grid', gap: 12 }}>
          {frU ? null : (
            <FormGrid>
              <TextInput id="fr-cond" label="Conditions before opening" multiline full readOnly={opened} defaultValue={st.frConditions || ''}
                placeholder="e.g. Add 2 chemical earth pits; patient toilet near collection; board as per brand manual" onChange={e => onSd(st, 'frConditions', e.target.value, 'textarea')} />
              <TextInput id="fr-val" label="Approval valid for (days)" type="number" min="1" readOnly={opened} defaultValue={st.frValidity || 90} onChange={e => onSd(st, 'frValidity', e.target.value, 'number')} />
            </FormGrid>
          )}
          {st.frConditions && frU ? <div><span className="eyebrow">Conditions before opening</span><p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{st.frConditions}</p></div> : null}
          <div className="actions"><Btn onClick={() => dlFrLetter(st.id)}>Download location approval letter</Btn></div>
          {stage === 'Approved' ? (
            <SForm onSubmit={fd => frOpen(st.id, fd)}>{busy => <>
              <TextInput id="fo-d" name="openedOn" label="Opened on" type="date" required defaultValue={TODAY} />
              <TextInput id="fo-c" name="centreCode" label="Centre code / name" placeholder="e.g. FR-SDP-CC-01" />
              <Cell full><Btn type="submit" primary disabled={busy}>Mark franchise centre opened</Btn></Cell>
            </>}</SForm>
          ) : <p className="small" style={{ margin: 0 }}>Centre {st.centreCode || ''} opened {fmtD(st.openedOn)}. Operations continue under the franchise agreement, outside TruSpace leases.</p>}
        </div>
      </Panel>
    </>
  }
  if (['Agreement', 'Take-over', 'Operational'].includes(stage)) {
    const L = S.leases.find(l => l.id === st.leaseId)
    return (
      <Panel title={<H3>Agreement &amp; handover</H3>}>
        <div className="actions">
          <Btn onClick={() => openProp(st.propertyId)}>Open property</Btn>
          {L ? <><Btn onClick={() => openLease(L.id)}>Lease {L.ref} · {leaseState(L)}</Btn><InspectionActions L={L} /></> : null}
        </div>
        <p className="small muted">Next steps: finalise and sign the lease (mark it signed &amp; active), then record the joint take-over inspection with the owner.</p>
      </Panel>
    )
  }
  if (stage === 'Approved') {
    return (
      <Panel title={<H3>Move to agreement</H3>}>
        <p className="small" style={{ marginTop: 0 }}>Approved by {st.approval?.by || ''} on {fmtD(st.approval?.at)}. Create the property and owner records and a draft lease with the negotiated terms.</p>
        <SForm onSubmit={fd => siteConvert(st.id, fd)}>{busy => <>
          <TextInput id="sc-code" name="code" label="Property code" required placeholder="HYD-KDP-CC" defaultValue={st.propCode || ''} hint="City–locality–number" />
          <TextInput id="sc-br" name="branch" label="Branch / hub" defaultValue="Begumpet (NRL)" />
          <Cell full><Btn type="submit" primary disabled={busy}>Create property &amp; draft lease</Btn></Cell>
        </>}</SForm>
      </Panel>
    )
  }
  return null
}
