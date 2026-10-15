/* Name board & signage (data-sg). */
import { SIGN_LOC } from '../../../domain/constants'
import { Panel } from '../../../components/ui/Layout'
import { FormGrid, TextInput, SelectInput } from '../../../components/form/Fields'
import { onSg } from './siteActions'
import { H3, SitePhotos, Field } from './parts'

export default function Signage({ st, slock }) {
  const sg = st.sign || {}
  const SG = (id, label, key) => <TextInput id={id} label={label} type="number" readOnly={slock} defaultValue={sg[key] ?? ''} onChange={e => onSg(st, key, e.target.value, 'number')} />
  const SS = (id, label, key, options) => <SelectInput id={id} label={label} options={options} disabled={slock} defaultValue={sg[key] ?? ''} onChange={e => onSg(st, key, e.target.value, 'select', true)} />
  const ST = (id, label, key, placeholder) => <TextInput id={id} label={label} full readOnly={slock} placeholder={placeholder} defaultValue={sg[key] || ''} onChange={e => onSg(st, key, e.target.value, 'text')} />
  return (
    <Panel id="it-__sign" title={<H3>Name board &amp; signage</H3>} sub="Where the TrustLab name board can go and how visible it will be.">
      <FormGrid>
        {SS('sg-loc', 'Name board position', 'loc', [['', '— choose —'], ...SIGN_LOC])}
        {SS('sg-lit', 'Illuminated / glow sign', 'lit', [['', '—'], 'Allowed — backlit / LED', 'Front-lit only', 'Non-lit only', 'Not yet confirmed'])}
        {SG('sg-w', 'Board width (ft)', 'w')}{SG('sg-h', 'Board height (ft)', 'h')}
        {SS('sg-vis', 'Visible from', 'vis', [['', '—'], 'Both directions of traffic', 'One direction only', 'Only when in front', 'Poor — hidden'])}
        {SG('sg-dist', 'Readable from (m)', 'dist')}
        {ST('sg-extra', 'Additional signage possible', 'extra', 'Pylon at gate, directional board on main road, window vinyl…')}
        {ST('sg-obs', 'Obstructions', 'obs', 'Trees, poles, neighbour’s boards, flyover')}
        {SS('sg-perm', 'Permission', 'perm', [['', '—'], 'Owner agreed in writing', 'Owner + society agreed', 'Municipal permission needed', 'Not yet asked'])}
        {SG('sg-fee', 'Signage fee / tax (₹ per year)', 'fee')}
      </FormGrid>
      <Field label="Photo of the board position (mark it if you can)">
        <SitePhotos st={st} k="__sign" files={sg.photos} locked={slock} need={sg.loc && sg.loc !== 'Not permitted' && !(sg.photos || []).length} />
      </Field>
    </Panel>
  )
}
