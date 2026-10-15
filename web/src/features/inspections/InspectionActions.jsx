/* Inspection buttons for a lease (prototype inspActionsFor). Props: { L } — renders the buttons, or null when there are none. */
import { useStore } from '../../store/store'
import { Btn } from '../../components/ui/Layout'
import { inspActions } from './inspButtons'

export default function InspectionActions({ L }) {
  useStore()
  const b = inspActions(L)
  if (!b.length) return null
  return <>{b.map(x => <Btn key={x.key} sm primary={x.primary} onClick={x.onClick}>{x.label}</Btn>)}</>
}
