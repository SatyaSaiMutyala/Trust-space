/* Joint sign-off controls for every inspection state (prototype inspSignControls + SUBMIT inspSubmit / inspOnsite / inspOwner). */
import { useState } from 'react'
import Box from '@mui/material/Box'
import { prop, owner, isOwner, tenantOf } from '../../store/store'
import { fmtD } from '../../domain/utils'
import { Btn, Banner, ActLink } from '../../components/ui/Layout'
import { FormGrid, Cell, TextInput, CheckField, FileInput } from '../../components/form/Fields'
import { ijump, inspReopen, inspSubmit, inspOnsite, inspOwner } from './actions'

/** Touch screens: give the jump links in the to-do list finger room between rows. */
const probsSx = { '@media (pointer:coarse)': { '& li': { py: '5px' } } }

/** Form that disables its buttons while the async handler runs. handler(formData, submitterValue). */
function SForm({ handler, children }) {
  const [busy, setBusy] = useState(false)
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return
    const fd = new FormData(e.currentTarget); const act = e.nativeEvent.submitter?.value
    setBusy(true); try { await handler(fd, act) } finally { setBusy(false) }
  }
  return <form onSubmit={onSubmit}><fieldset disabled={busy} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }}><FormGrid>{children}</FormGrid></fieldset></form>
}

export default function SignControls({ I, probs }) {
  const o = isOwner(); const tn = tenantOf(prop(I.propertyId))
  if (I.status === 'Signed') return <p className="small muted" style={{ margin: 0 }}>Signed by both parties and locked. {I.kind === 'Move-out' ? 'Agreed deductions have been carried to the deposit settlement.' : 'This is the baseline for the handover inspection.'}</p>
  if (o) {
    if (I.status !== 'Awaiting owner sign-off') return <p className="small muted" style={{ margin: 0 }}>{tn} is still recording this inspection. You will be able to sign once it is submitted.</p>
    if (!I.ownerVideo) return (
      <>
        <Banner><b>Record your confirmation video first.</b> Use “Record video” under Video confirmations, then come back here to sign. You can still raise a dispute without a video.</Banner>
        <SForm handler={fd => inspOwner(I.id, fd, 'dispute')}>
          <TextInput id="io-d" name="dispute" label="If you disagree, explain what is wrong" multiline required full />
          <Cell full><Btn danger type="submit" name="act" value="dispute">Raise dispute</Btn></Cell>
        </SForm>
      </>
    )
    return (
      <SForm handler={(fd, act) => inspOwner(I.id, fd, act || 'sign')}>
        <TextInput id="io-n" name="name" label="Your full name" defaultValue={owner(I.ownerId)?.name || ''} required />
        <Cell />
        <CheckField id="io-a" name="agree" label={`I inspected the premises jointly with ${tn} on ${fmtD(I.date)} and agree that this record, including the photos, reflects the condition of the premises.`} />
        <TextInput id="io-d" name="dispute" label="If you disagree, explain what is wrong" multiline placeholder="Leave blank if you agree" full />
        <Cell full><div className="actions"><Btn primary type="submit" name="act" value="sign">Agree &amp; sign</Btn><Btn danger type="submit" name="act" value="dispute">Raise dispute</Btn></div></Cell>
      </SForm>
    )
  }
  if (I.status === 'Awaiting owner sign-off') return (
    <>
      <p className="small" style={{ margin: 0 }}>Submitted. The owner can sign from their TruSpace portal, or sign now on this device while you are together on site.</p>
      <SForm handler={fd => inspOnsite(I.id, fd)}>
        <TextInput id="ios-n" name="name" label="Owner’s full name (typed by the owner)" defaultValue={I.ownerRep || ''} required />
        <FileInput id="ios-p" name="files" label="Photo of signed paper checklist (optional)" accept="image/*,application/pdf" capture="environment" full={false} />
        <CheckField id="ios-a" name="agree" required label={`Owner: I inspected the premises jointly with ${tn} and agree with this record.`} />
        {I.ownerVideo ? null : <Cell full><Banner>The owner’s confirmation video is required before signing. Record it under Video confirmations.</Banner></Cell>}
        <Cell full><div className="actions"><Btn primary type="submit" disabled={!I.ownerVideo}>Owner signs on this device</Btn><Btn onClick={() => inspReopen(I.id)}>Reopen for correction</Btn></div></Cell>
      </SForm>
    </>
  )
  return (
    <>
      {probs.length ? (
        <Banner><b>{probs.length} item{probs.length > 1 ? 's' : ''} to complete before sign-off:</b>
          <Box component="ul" className="probs" sx={probsSx}>
            {probs.slice(0, 8).map(([k, m], i) => <li key={i}><ActLink href={`#it-${k}`} onClick={() => ijump(k)}>{m}</ActLink></li>)}
            {probs.length > 8 ? <li>…and {probs.length - 8} more</li> : null}
          </Box>
        </Banner>
      ) : null}
      <SForm handler={() => inspSubmit(I.id)}>
        <CheckField id="is-a" name="agree" required disabled={!!probs.length} label={`For ${tn}: I inspected the premises jointly with the owner and this record is complete and accurate.`} />
        <Cell full><div className="actions"><Btn primary type="submit" disabled={!!probs.length}>Sign &amp; send to owner</Btn></div></Cell>
      </SForm>
    </>
  )
}
