/* New / edit scouting requirement (prototype DRAWERS.req + SUBMIT.req). */
import { useState } from 'react'
import { S, useStore, closeDrawer } from '../../store/store'
import { SITE_PURPOSE } from '../../domain/constants'
import { TODAY } from '../../domain/utils'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn, ActLink } from '../../components/ui/Layout'
import { FormGrid, Cell, SectionTitle, TextInput, SelectInput } from '../../components/form/Fields'
import { newPartner, submitReq } from './actions'

export default function ReqDrawer({ d }) {
  useStore()
  const r = d.id ? S.reqs.find(x => x.id === d.id) : { city: 'Hyderabad', state: 'Telangana', purpose: 'Collection centre', priority: 'Normal', raisedOn: TODAY }
  const [model, setModel] = useState(r?.model || 'TrustLab lease')
  const [busy, setBusy] = useState(false)
  if (!r) return <DrawerLayout title="Requirement"><div className="empty">Not found.</div></DrawerLayout>
  const cities = [...new Set(S.reqs.map(x => x.city).concat(S.properties.map(p => p.city)).filter(Boolean))].sort()
  const onSubmit = async e => { e.preventDefault(); setBusy(true); try { await submitReq(d.id, new FormData(e.currentTarget)) } finally { setBusy(false) } }
  return (
    <DrawerLayout
      title={d.id ? `Edit requirement ${r.code}` : 'New scouting requirement'}
      sub="Set the scene before scouting: where TrustLab needs premises, and why. Every site scouted is logged under a requirement."
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-req" disabled={busy}>{d.id ? 'Save requirement' : 'Create & start scouting'}</Btn></>}
    >
      <form id="f-req" onSubmit={onSubmit} key={d.id || 'new'}>
        <FormGrid>
          <SectionTitle first>1 · Location</SectionTitle>
          <TextInput id="rq-city" name="city" label="City / town" defaultValue={r.city} required list="rq-cities" />
          <datalist id="rq-cities">{cities.map(c => <option key={c}>{c}</option>)}</datalist>
          <TextInput id="rq-state" name="state" label="State" defaultValue={r.state} required />
          <TextInput id="rq-area" name="area" label="Area / locality to cover" defaultValue={r.area} required placeholder="e.g. Kondapur – Gachibowli belt" full hint="The location used to group scouting" />
          <SectionTitle>2 · Reason</SectionTitle>
          <SelectInput id="rq-pur" name="purpose" label="Setting up a" options={SITE_PURPOSE} defaultValue={r.purpose} />
          <SelectInput id="rq-mod" name="model" label="Engagement" options={[['TrustLab lease', 'TrustLab takes the lease'], ['Franchise', 'Franchise — TrustLab assesses only']]} value={model} onChange={e => setModel(e.target.value)} hint="Franchise sites never create a TrustLab lease" />
          <Cell full sx={model === 'Franchise' ? undefined : { display: 'none' }}>
            <FormGrid>
              <SelectInput id="rq-pa" name="partnerId" label="Franchise partner" placeholder="— choose —" options={S.partners.map(pa => [pa.id, pa.name])} defaultValue={r.partnerId || ''} hint={<ActLink onClick={newPartner}>Add a partner</ActLink>} />
              <SelectInput id="rq-sb" name="scoutBy" label="Who scouts" options={[['Franchisee', 'Franchise partner scouts, TrustLab assesses'], ['TrustLab', 'TrustLab scouts and assesses'], ['Both', 'Both scout, TrustLab assesses']]} defaultValue={r.scoutBy || 'Franchisee'} />
            </FormGrid>
          </Cell>
          <TextInput id="rq-why" name="reason" label="Why here" multiline required full defaultValue={r.reason || ''} placeholder="e.g. Home-collection demand in West Hyderabad is served from Begumpet with 45-min TAT; three hospital tie-ups need a nearby collection point" />
          <SectionTitle>3 · Brief for the scouting team</SectionTitle>
          <TextInput id="rq-amin" name="areaMin" label="Area from (sq ft)" type="number" min="0" defaultValue={r.areaMin} />
          <TextInput id="rq-amax" name="areaMax" label="Area up to (sq ft)" type="number" min="0" defaultValue={r.areaMax} />
          <TextInput id="rq-rent" name="rentMax" label="Rent budget up to (₹/month)" type="number" min="0" defaultValue={r.rentMax} />
          <TextInput id="rq-tgt" name="target" label="Target opening date" type="date" defaultValue={r.target} />
          <SelectInput id="rq-pri" name="priority" label="Priority" options={['High', 'Normal', 'Low']} defaultValue={r.priority} />
          <TextInput id="rq-by" name="raisedBy" label="Raised by" defaultValue={r.raisedBy} placeholder="e.g. Business Head – Commercials" />
          <TextInput id="rq-must" name="musts" label="Must-haves" multiline full defaultValue={r.musts || ''} placeholder="Ground floor, main-road frontage, 3-phase power, parking for 4 two-wheelers…" />
          {d.id ? <SelectInput id="rq-st" name="status" label="Status" options={[['Open', 'Open'], ['Cancelled', 'Cancelled']]} defaultValue={r.status || 'Open'} /> : null}
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
