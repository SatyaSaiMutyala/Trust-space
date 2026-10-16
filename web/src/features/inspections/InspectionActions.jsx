/* Inspection buttons for a lease (prototype inspActionsFor). Props: { L } — renders the buttons, or null when there are none.
   A skipped take-over / handover adds a one-line tag (when, by whom); the reason and note are in the "Skipped" drawer. */
import { useStore } from '../../store/store'
import { fmtD } from '../../domain/utils'
import { Btn } from '../../components/ui/Layout'
import { inspActions } from './inspButtons'

const Tag = ({ label, sk }) => sk ? <div className="small muted" style={{ flexBasis: '100%', marginTop: -2 }}>{label} skipped on {fmtD(sk.on)} by {sk.by}</div> : null

export default function InspectionActions({ L }) {
  useStore()
  const b = inspActions(L)
  if (!b.length) return null
  return <>{b.map(x => <Btn key={x.key} sm primary={x.primary} onClick={x.onClick}>{x.label}</Btn>)}<Tag label="Take-over" sk={L.takeoverSkip} /><Tag label="Handover" sk={L.handoverSkip} /></>
}
