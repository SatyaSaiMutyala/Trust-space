/* Exits & terminations (prototype viewExits). */
import { Fragment, useState } from 'react'
import { S, prop, useStore } from '../../store/store'
import { startExit } from '../../store/actions'
import { leaseState } from '../../domain/lease'
import { Btn, PageHead, Stack, Empty } from '../../components/ui/Layout'
import { SampleBanner } from '../../components/app/Banners'
import FilterSelect from '../tickets/FilterSelect'
import ExitPanel from './ExitPanel'

export default function ExitsPage() {
  useStore()
  const [pick, setPick] = useState('')
  const ex = S.leases.filter(l => l.exit && l.exit.noticeDate)
  const eligible = S.leases.filter(l => ['Active', 'Renewal due', 'Expired'].includes(leaseState(l)))
  return (
    <Stack>
      <PageHead title="Exits & terminations" sub="Notice, joint inspection, handover, final settlement and deposit refund — each exit tracked to closure."
        actions={eligible.length ? <>
          <FilterSelect id="exitPick" ariaLabel="Lease to terminate" value={pick} onChange={e => setPick(e.target.value)} placeholder="Choose a lease…" options={eligible.map(l => [l.id, `${prop(l.propertyId)?.name} · ${l.ref}`])} />
          <Btn primary onClick={() => startExit(pick)}>Serve notice</Btn>
        </> : null} />
      <SampleBanner />
      {ex.length ? ex.map(L => (
        <Fragment key={L.id}>
          <h2>{prop(L.propertyId)?.name} <span className="code">{L.ref}</span></h2>
          <ExitPanel L={L} />
        </Fragment>
      )) : <Empty panel>No exits in progress.</Empty>}
    </Stack>
  )
}
