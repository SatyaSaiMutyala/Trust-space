/* Site details (data-sd, saved as you type) and site photos (minimum 3). */
import { SITE_PURPOSE } from '../../../domain/constants'
import { Panel } from '../../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput } from '../../../components/form/Fields'
import { onSd } from './siteActions'
import { H3, SitePhotos, Field } from './parts'

export default function SiteDetails({ st }) {
  const D = (id, label, key, type, extra = {}) => (
    <TextInput key={id} id={id} label={label} type={type || 'text'} defaultValue={st[key] ?? ''} onChange={e => onSd(st, key, e.target.value, type || 'text')} {...extra} />
  )
  const Sel = (id, label, key, options) => <SelectInput id={id} label={label} options={options} defaultValue={st[key] ?? ''} onChange={e => onSd(st, key, e.target.value, 'select')} />
  return (
    <Panel title={<H3>Site details</H3>} actions={<span className="small muted">Saved as you type</span>}>
      <FormGrid>
        {D('sd-n', 'Site name', 'name', 'text', { required: true, full: true })}
        {D('sd-loc', 'Locality', 'locality')}{D('sd-city', 'City', 'city')}
        {D('sd-addr', 'Full address', 'address', 'text', { full: true })}
        {Sel('sd-pur', 'Intended use', 'purpose', SITE_PURPOSE)}{D('sd-fl', 'Floor', 'floor', 'text', { placeholder: 'Ground floor' })}
        {D('sd-ar', 'Quoted area (sq ft)', 'area', 'number')}{D('sd-mar', 'Measured carpet area (sq ft)', 'measuredArea', 'number')}
        {D('sd-fr', 'Frontage (ft)', 'frontage', 'number')}{D('sd-map', 'Map link', 'map', 'url', { placeholder: 'Google Maps link' })}
        {D('sd-qr', 'Quoted rent (₹/month)', 'quotedRent', 'number')}{D('sd-qd', 'Deposit asked (₹)', 'quotedDeposit', 'number')}
        {D('sd-on', 'Owner name', 'ownerName')}{D('sd-op', 'Owner phone', 'ownerPhone')}
        {Sel('sd-ok', 'Owner type', 'ownerKind', ['Individual', 'HUF', 'Company', 'LLP', 'Firm', 'Trust'])}
        {Sel('sd-og', 'Owner GST status', 'ownerGst', [['', '—'], ['Registered', 'Registered (GST on invoice)'], ['Unregistered', 'Unregistered (TrustLab pays RCM)']])}
        {D('sd-br', 'Broker / source', 'broker')}{D('sd-sb', 'Scouted by', 'scoutedBy')}
        {D('sd-so', 'Scouted on', 'scoutedOn', 'date')}
        <TextInput id="sd-nt" label="Notes" multiline full defaultValue={st.notes || ''} onChange={e => onSd(st, 'notes', e.target.value, 'textarea')} />
      </FormGrid>
      {st.map ? <p className="small"><a href={st.map} target="_blank" rel="noopener noreferrer">Open location in maps ↗</a></p> : null}
      <Field id="it-__site" label="Site photos — front, inside, approach road (minimum 3)">
        <SitePhotos st={st} k="__site" files={st.photos} need={(st.photos || []).length < 3} photoLabel="＋ Photos" />
      </Field>
    </Panel>
  )
}
