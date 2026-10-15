/* Franchise partners list (prototype DRAWERS.partners). */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S, ALL, useStore } from '../../store/store'
import { siteStage } from '../../domain/site'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn, TableCard } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { newPartner, editPartner } from './actions'

export default function PartnersDrawer() {
  useStore()
  return (
    <DrawerLayout title="Franchise partners" sub="Partners whose locations TrustLab assesses." footer={<Btn primary onClick={newPartner}>Add partner</Btn>}>
      {S.partners.length ? (
        <TableCard>
          <TableHead>
            <TableRow><TableCell>Partner</TableCell><TableCell>Model</TableCell><TableCell>Contact</TableCell><TableCell>Locations</TableCell><TableCell>Status</TableCell><TableCell /></TableRow>
          </TableHead>
          <TableBody>
            {S.partners.map(pa => {
              const rq = S.reqs.filter(q => q.partnerId === pa.id); const st = S.sites.filter(x => rq.some(q => q.id === x.reqId))
              return (
                <TableRow key={pa.id}>
                  <TableCell><b>{pa.name}</b><div className="small muted">{pa.city || ''}{pa.agreementRef ? ' · ' + pa.agreementRef : ''}</div></TableCell>
                  <TableCell className="small">{pa.model}</TableCell>
                  <TableCell className="small">{pa.contact || ''}<br />{pa.phone || ''}</TableCell>
                  <TableCell className="small">{rq.length} requirement(s) · {st.length} site(s) · {st.filter(x => ['Approved', 'Opened'].includes(siteStage(x))).length} approved{pa.premisesMgmt ? <><br /><StatusChip label="Manages premises in TruSpace" k="info" /> {ALL.properties.filter(p => p.partnerId === pa.id).length} premises</> : null}</TableCell>
                  <TableCell><StatusChip label={pa.status} k={pa.status === 'Active' ? 'ok' : 'idle'} /></TableCell>
                  <TableCell><div className="actions"><Btn sm onClick={() => editPartner(pa.id)}>Edit</Btn></div></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </TableCard>
      ) : <div className="empty">No franchise partners yet.</div>}
    </DrawerLayout>
  )
}
