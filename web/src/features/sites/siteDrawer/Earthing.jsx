/* Earthing assessment (data-se) with the .eplan advice box and the pits-short warning. */
import { earthPlan } from '../../../domain/site'
import { SOILS, PIT_LOC } from '../../../domain/constants'
import { Panel } from '../../../components/ui/Layout'
import { StatusChip } from '../../../components/ui/Status'
import { FormGrid, TextInput, SelectInput, SectionTitle } from '../../../components/form/Fields'
import { onSe } from './siteActions'
import { H3, SitePhotos, Field } from './parts'

export default function Earthing({ st, slock }) {
  const e = st.earth || {}; const ep = earthPlan(st)
  const EI = (id, label, key, type, extra = {}, hint) => <TextInput id={id} label={label} type={type || 'number'} readOnly={slock} defaultValue={e[key] ?? ''} hint={hint} onChange={ev => onSe(st, key, ev.target.value, type || 'number')} {...extra} />
  const ES = (id, label, key, opts) => <SelectInput id={id} label={label} disabled={slock} options={[['', '— choose —'], ...opts]} defaultValue={e[key] ?? ''} onChange={ev => onSe(st, key, ev.target.value, 'select')} />
  return (
    <Panel id="it-__earth" title={<H3>Earthing assessment</H3>} sub="Analysers need clean, low-resistance earthing. Soil decides how hard that is, and pits need room and upkeep."
      actions={e.soil ? <StatusChip label={e.soil} k={ep.soil?.k} /> : <StatusChip label="Not assessed" k="idle" />}>
      <FormGrid>
        <SectionTitle first>Soil</SectionTitle>
        {ES('ea-soil', 'Soil type at pit location', 'soil', Object.keys(SOILS))}
        {EI('ea-sn', 'Soil notes', 'soilNote', 'text', { placeholder: 'e.g. rock at 1.5 m; moist layer at 4 m' })}
        <SectionTitle>Existing earthing</SectionTitle>
        {EI('ea-ex', 'Existing earth pits', 'pitsExisting', 'number', { min: '0' })}
        {ES('ea-et', 'Existing pit type', 'pitType', ['Conventional pipe', 'Conventional plate', 'Chemical / maintenance-free', 'Unknown', 'None'])}
        {EI('ea-r', 'Measured earth resistance (Ω)', 'resist', 'number', { step: '0.1', min: '0' }, 'Enter 0 if there is no pit')}
        {EI('ea-v', 'Neutral–earth voltage (V)', 'nev', 'number', { step: '0.1', min: '0' })}
        {EI('ea-md', 'Measured on', 'measuredOn', 'date')}{EI('ea-mb', 'Measured by', 'measuredBy', 'text', { placeholder: 'Electrician / BMO' })}
        <SectionTitle>Space for additional pits</SectionTitle>
        {EI('ea-pp', 'New pits possible', 'pitsPossible', 'number', { min: '0' }, `Needed for a ${(st.purpose || '').toLowerCase()}: ${ep.need}`)}
        {ES('ea-pl', 'Where new pits can go', 'pitLoc', PIT_LOC)}
        {EI('ea-dist', 'Distance from pits to main panel (m)', 'dist', 'number', { min: '0' })}
        {ES('ea-wt', 'Water available near pits', 'water', ['Yes — tap nearby', 'Yes — carry from sump', 'No'])}
        <SectionTitle>Maintenance</SectionTitle>
        {ES('ea-ac', 'Access for watering and testing', 'access', ['Yes — inspection chambers fitted', 'Yes — no chambers yet', 'Difficult — under paving or storage', 'No access'])}
        {ES('ea-mby', 'Earthing maintained by', 'maintBy', ['TrustLab (BMO)', 'Owner', 'AMC vendor'])}
      </FormGrid>
      {e.soil || e.pitsPossible !== undefined ? (
        <div className="eplan">
          <div><span className="eyebrow">Effect of soil</span><p>{ep.soil?.eff || 'Choose the soil type.'}</p></div>
          <div><span className="eyebrow">Suggested earthing</span><p>{ep.soil?.rec || ''} {ep.text}</p>{ep.short ? <p style={{ color: 'var(--bad)' }}><b>Space for only {ep.have} new pit{ep.have === 1 ? '' : 's'} — {ep.need} needed.</b></p> : null}</div>
          <div><span className="eyebrow">Maintenance routine</span><p>{ep.soil?.water || ''} Test resistance and neutral–earth voltage before and after every monsoon (at least twice a year) and record the readings; keep chambers clear and labelled.</p></div>
        </div>
      ) : null}
      <p className="small muted" style={{ margin: '10px 0 0' }}>A guide only — the electrical contractor confirms the design after a soil-resistivity test.</p>
      <Field label="Photos of pit location and existing pits / readings">
        <SitePhotos st={st} k="__earth" files={e.photos} locked={slock} />
      </Field>
    </Panel>
  )
}
