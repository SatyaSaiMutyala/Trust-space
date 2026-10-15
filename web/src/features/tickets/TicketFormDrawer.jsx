/* New ticket / Report an issue (prototype DRAWERS.ticket + SUBMIT.ticket). */
import { useState } from 'react'
import Box from '@mui/material/Box'
import DrawerLayout from '../../components/app/DrawerLayout'
import { isOwner, scopeProps, closeDrawer, useStore } from '../../store/store'
import { TCAT, PRI } from '../../domain/constants'
import { Btn } from '../../components/ui/Layout'
import { FormGrid, FieldBox, TextInput, SelectInput } from '../../components/form/Fields'
import { submitTicket } from './actions'
import { fileSx } from './fileSx'

export default function TicketFormDrawer({ d }) {
  useStore()
  const [busy, setBusy] = useState(false)
  const props = scopeProps(); const o = isOwner()
  const t = { priority: 'P3', category: 'Electrical', responsibility: o ? 'Owner' : 'TrustLab', propertyId: d.prop || props[0]?.id }
  const onSubmit = async e => {
    e.preventDefault(); if (busy) return; setBusy(true)
    try { await submitTicket(new FormData(e.currentTarget)) } finally { setBusy(false) }
  }
  return (
    <DrawerLayout title={o ? 'Report an issue' : 'New ticket'} sub="Add photos of the problem — before and after photos are kept with the ticket."
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-tk" disabled={busy}>Raise ticket</Btn></>}>
      <form id="f-tk" onSubmit={onSubmit}>
        <FormGrid>
          <TextInput id="tk-t" name="title" label="What is the problem?" required full placeholder="e.g. Water leaking from AC drain line" />
          <SelectInput id="tk-p" name="propertyId" label="Property" options={props.map(p => [p.id, p.name])} defaultValue={t.propertyId} />
          <SelectInput id="tk-c" name="category" label="Category" options={TCAT} defaultValue={TCAT.includes(t.category) ? t.category : TCAT[0]} />
          <SelectInput id="tk-pr" name="priority" label="Priority" options={Object.entries(PRI).map(([k, v]) => [k, `${v.l} — ${v.h < 24 ? v.h + ' h' : v.h / 24 + ' d'} SLA`])} defaultValue={t.priority} />
          <SelectInput id="tk-r" name="responsibility" label="Whose responsibility (per lease)" options={['Owner', 'TrustLab', 'Shared']} defaultValue={t.responsibility} />
          {o ? null : (
            <>
              <TextInput id="tk-as" name="assignee" label="Assign to" defaultValue="Owner contractor" list="assignees" />
              <datalist id="assignees"><option>Owner contractor</option><option>BMO — Facilities maintenance</option><option>Facilities &amp; Front Office</option></datalist>
            </>
          )}
          <TextInput id="tk-d" name="text" label="Details" required full multiline placeholder="Where exactly, since when, impact on lab operations" />
          <FieldBox id="tk-ph" label="Photos" hint="Opens the camera on a phone"><Box component="input" type="file" id="tk-ph" name="files" multiple accept="image/*" capture="environment" sx={fileSx} /></FieldBox>
          <FieldBox id="tk-vd" label="Video" hint="Short clip of the problem — under 20 MB"><Box component="input" type="file" id="tk-vd" name="files" accept="video/*" capture="environment" sx={fileSx} /></FieldBox>
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
