/* Negotiated terms (TrustLab) or the franchisee's proposed lease terms (data-st). */
import { Panel } from '../../../components/ui/Layout'
import { FormGrid, TextInput } from '../../../components/form/Fields'
import { onSt } from './siteActions'
import { H3 } from './parts'

export default function Terms({ st, fr, stage }) {
  const t = st.terms || {}
  const ro = ['Approved', 'Agreement', 'Take-over', 'Operational'].includes(stage)
  const T = (id, label, key, type = 'number', extra = {}) => <TextInput key={id} id={id} label={label} type={type} readOnly={ro} defaultValue={t[key] ?? ''} onChange={e => onSt(st, key, e.target.value, type)} {...extra} />
  if (fr) {
    return (
      <Panel id="sterms" title={<H3>Franchisee’s proposed lease terms (for reference)</H3>} sub="Agreed between the franchise partner and the owner. TrustLab records them only to judge viability.">
        <FormGrid>{T('st-r', 'Rent proposed (₹/month)', 'rent')}{T('st-d', 'Deposit (₹)', 'deposit')}{T('st-t', 'Term (months)', 'term')}{T('st-l', 'Lock-in (months)', 'lockIn')}</FormGrid>
      </Panel>
    )
  }
  return (
    <Panel id="sterms" title={<H3>Negotiated terms</H3>} sub="These carry into the draft lease on approval.">
      <FormGrid>
        {T('st-r', 'Agreed rent (₹/month)', 'rent')}{T('st-d', 'Security deposit (₹)', 'deposit')}
        {T('st-t', 'Term (months)', 'term')}{T('st-l', 'Lock-in (months)', 'lockIn')}
        {T('st-e', 'Escalation %', 'escPct', 'number', { step: '0.5' })}{T('st-ee', 'Escalate every (months)', 'escEvery')}
        {T('st-f', 'Rent-free fit-out (days)', 'fitout')}{T('st-n', 'Notice period (months)', 'notice')}
        {T('st-a', 'Advance rent (₹)', 'advance')}{T('st-m', 'Maintenance (₹/month)', 'maint')}
        {T('st-s', 'Expected possession date', 'start', 'date')}{T('st-b', 'Brokerage (₹)', 'brokerage')}
        <TextInput id="st-w" label="Works the owner will complete before handover" multiline full readOnly={ro} defaultValue={t.ownerWorks || ''}
          placeholder="e.g. 3-phase connection, 2 earth pits, patient toilet near collection, waterproof terrace" onChange={e => onSt(st, 'ownerWorks', e.target.value, 'textarea')} />
      </FormGrid>
    </Panel>
  )
}
