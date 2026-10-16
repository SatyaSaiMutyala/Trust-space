/* Inspection buttons for a lease (prototype inspActionsFor). Props: { L } — renders the buttons, or null when there are none.
   A skipped take-over / handover also shows who skipped it, when and the note, so the reason is visible without opening it. */
import { useStore } from '../../store/store'
import { fmtD } from '../../domain/utils'
import { Btn } from '../../components/ui/Layout'
import { inspActions } from './inspButtons'

function SkipNote({ label, sk }) {
  if (!sk) return null
  return <div className="small muted" style={{ flexBasis: '100%', marginTop: 2 }}><b>{label} skipped</b> {fmtD(sk.on)} · {sk.by} · {sk.reason} — {sk.note}</div>
}

export default function InspectionActions({ L }) {
  useStore()
  const b = inspActions(L)
  if (!b.length) return null
  return <>{b.map(x => <Btn key={x.key} sm primary={x.primary} onClick={x.onClick}>{x.label}</Btn>)}<SkipNote label="Take-over" sk={L.takeoverSkip} /><SkipNote label="Handover" sk={L.handoverSkip} /></>
}
