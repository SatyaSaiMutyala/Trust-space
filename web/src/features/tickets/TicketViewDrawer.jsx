/* Ticket detail: facts, photos, activity and the update form (prototype DRAWERS.ticketView + SUBMIT.tupdate). */
import { useState } from 'react'
import Box from '@mui/material/Box'
import DrawerLayout from '../../components/app/DrawerLayout'
import { S, isOwner, prop, remove, closeDrawer, useStore } from '../../store/store'
import { TSTAT, PRI } from '../../domain/constants'
import { slaBreached, slaDue } from '../../domain/lease'
import { fmtDT, inr } from '../../domain/utils'
import { Btn, Panel, Facts, Empty } from '../../components/ui/Layout'
import { StatusChip, PriChip, Timeline, ConfirmButton } from '../../components/ui/Status'
import { PhotoStrip } from '../../components/ui/Media'
import { FormGrid, Cell, FieldBox, TextInput, SelectInput } from '../../components/form/Fields'
import { submitTicketUpdate } from './actions'
import { fileSx } from './fileSx'

const fileInput = (id, multiple) => <Box component="input" type="file" id={id} name="files" multiple={multiple} accept={multiple ? 'image/*' : 'video/*'} capture="environment" sx={fileSx} />

export default function TicketViewDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const t = S.tickets.find(x => x.id === d.id)
  if (!t) return <DrawerLayout title="Ticket"><Empty>Removed.</Empty></DrawerLayout>
  const o = isOwner()
  const allPhotos = (t.photos || []).concat(...(t.log || []).map(l => l.photos || []))
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitTicketUpdate(t.id, new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={`${t.no} · ${t.title}`}
      sub={<>{prop(t.propertyId)?.name || ''} · <PriChip p={t.priority} /> <StatusChip label={t.status} /> {slaBreached(t) ? <StatusChip label="SLA breached" k="bad" /> : null}</>}
      footer={o ? null : <ConfirmButton label="Delete ticket" onConfirm={() => { closeDrawer(); remove('tickets', t.id) }} />}>
      <Facts items={[
        ['Category', t.category], ['Responsibility', t.responsibility], ['Assigned to', t.assignee || '—'],
        ['Raised', `${t.raisedBy} · ${fmtDT(t.createdAt)}`], ['SLA due', fmtDT(slaDue(t))],
        ['Cost', t.cost ? `${inr(t.cost)} · borne by ${t.costBy || t.responsibility}` : '—'],
      ]} />
      <Panel title={<h3>Photos ({allPhotos.length})</h3>}><PhotoStrip files={allPhotos} empty="No photos yet" /></Panel>
      <Panel title={<h3>Activity</h3>}>
        <Timeline entries={(t.log || []).map(l => ({ text: l.text, by: l.by, at: l.at, extra: (l.photos || []).length ? <PhotoStrip files={l.photos} /> : null, meta: l.status ? ' · status → ' + l.status : '' }))} />
      </Panel>
      <Panel title={<h3>Add an update</h3>}>
        <form onSubmit={onSubmit} key={(t.log || []).length + t.status}>
          <FormGrid>
            <TextInput id="tu-t" name="text" label="Update" required full multiline placeholder="What was done, findings, next step" />
            <SelectInput id="tu-s" name="status" label="Status" options={TSTAT} defaultValue={t.status} />
            <FieldBox id="tu-ph" label="Photos (before / after)">{fileInput('tu-ph', true)}</FieldBox>
            <FieldBox id="tu-vd" label="Video (before / after)">{fileInput('tu-vd', false)}</FieldBox>
            {o ? null : <TextInput id="tu-as" name="assignee" label="Assigned to" defaultValue={t.assignee} />}
            {o ? null : <SelectInput id="tu-pr" name="priority" label="Priority" options={Object.entries(PRI).map(([k, v]) => [k, v.l])} defaultValue={t.priority} />}
            <TextInput id="tu-c" name="cost" label="Repair cost (₹)" type="number" min="0" defaultValue={t.cost || ''} />
            <SelectInput id="tu-cb" name="costBy" label="Cost borne by" options={['Owner', 'TrustLab', 'Shared']} defaultValue={t.costBy || t.responsibility} />
            <Cell full><Btn primary type="submit" disabled={busy}>Post update</Btn></Cell>
          </FormGrid>
        </form>
      </Panel>
    </DrawerLayout>
  )
}
