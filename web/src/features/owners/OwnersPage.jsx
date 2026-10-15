/*
 * Owners register (prototype viewOwners). Server-side list: search (name, phone, email, PAN, GSTIN, city, bank),
 * owner type, bank status and pagination via GET /api/owners. Portal access comes from the owner accounts in
 * /api/users (role=owner).
 */
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '../invoices/TableCell'
import { S, useStore } from '../../store/store'
import { newOwner, editOwner, viewOwnerProfile } from '../../store/actions'
import { inr, CUR } from '../../domain/utils'
import { leaseOf, leaseState, rentFor, maskAcct } from '../../domain/lease'
import { PageHead, Btn, TableCard, Empty } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { TableSkeleton, Refreshing } from '../../components/ui/Skeletons'
import { SampleBanner } from '../../components/app/Banners'
import { useServerList } from '../../components/list/useServerList'
import { ListToolbar, ListFilter, Pager } from '../../components/list/ListControls'
import ComboFilter from '../invoices/ComboFilter'
import { BankChip } from './OwnerProfile'

const KINDS = ['Individual', 'HUF', 'Company', 'LLP', 'Firm', 'Trust']
const NONE = { bankVerified: '', bankPending: '' }
const BANK = [
  ['verified', 'Verified', { ...NONE, bankVerified: 'true' }],
  ['pending', 'Change awaiting verification', { ...NONE, bankPending: 'true' }],
  ['unverified', 'Not verified', { ...NONE, bankVerified: 'false' }],
]

/* Above phone width the actions stay visible at the right edge even when the table has to scroll. */
const STICKY = { '@media (min-width:601px)': { position: 'sticky', right: 0, zIndex: 1, bgcolor: 'var(--surface)', boxShadow: 'inset 1px 0 0 var(--line)' } }

const NW = { whiteSpace: 'nowrap' }
/** An email that may wrap only before the “@”. */
const Email = ({ v }) => { const i = (v || '').indexOf('@'); return i > 0 ? <>{v.slice(0, i)}<wbr />{v.slice(i)}</> : v || '' }

/** Portal column: Linked when an active owner account points at this owner, Disabled when its only accounts are disabled. */
function Portal({ accounts }) {
  if (accounts.some(a => a.status !== 'disabled')) return <StatusChip label="Linked" k="ok" />
  if (accounts.length) return <StatusChip label="Disabled" k="bad" />
  return <StatusChip label="Not linked" k="idle" />
}

export default function OwnersPage() {
  useStore()
  const L = useServerList('owners', 'owners', { defaults: { limit: 10 } })
  const U = useServerList('owners-accounts', 'users', { defaults: { limit: 100 }, fixed: { role: 'owner' } })
  return (
    <>
      <PageHead title="Owners" sub="Landlords of TrustLab premises, their tax status and portal access." actions={<Btn primary onClick={newOwner}>Add owner</Btn>} />
      <SampleBanner />
      <ListToolbar list={L} searchPlaceholder="Search name, phone, email, PAN, GSTIN, city or bank">
        <ListFilter list={L} name="kind" label="Type" allLabel="All types" options={KINDS} width={150} />
        <ComboFilter list={L} label="Bank" allLabel="Any bank status" options={BANK} width={230} />
      </ListToolbar>
      {!L.rows.length && L.isFetching ? <TableSkeleton rows={6} cols={9} /> : L.rows.length ? (
        <Refreshing on={L.isFetching}><TableCard>
          <TableHead><TableRow><TableCell>Owner</TableCell><TableCell>Contact</TableCell><TableCell>Emergency</TableCell><TableCell>PAN / GSTIN</TableCell><TableCell>Bank for rent</TableCell><TableCell>Properties</TableCell><TableCell className="num">Monthly rent</TableCell><TableCell>Portal</TableCell><TableCell sx={STICKY} /></TableRow></TableHead>
          <TableBody>
            {L.rows.map(o => {
              const ps = S.properties.filter(p => p.ownerId === o.id)
              const rent = ps.map(p => leaseOf(p.id)).filter(l => l && !['Draft', 'Terminated'].includes(leaseState(l))).reduce((s, l) => s + rentFor(l, CUR), 0)
              return (
                <TableRow key={o.id}>
                  <TableCell sx={{ minWidth: 120 }}><b>{o.name}</b><div className="small muted">{o.kind}</div></TableCell>
                  <TableCell className="small"><span style={NW}>{o.phone}</span>{o.whatsapp && o.whatsapp !== o.phone ? <><br /><span style={NW}>WA {o.whatsapp}</span></> : null}<br /><Email v={o.email} /></TableCell>
                  <TableCell className="small" sx={{ minWidth: 120 }}>{o.emergency?.phone ? <>{o.emergency.name || ''}{o.emergency.rel ? ' (' + o.emergency.rel + ')' : ''}<br /><span style={NW}>{o.emergency.phone}</span></> : <span className="muted">Not set</span>}</TableCell>
                  <TableCell className="mono small">{o.pan || '—'}<br />{o.gstin || 'GST unregistered'}</TableCell>
                  <TableCell className="small">{o.bankName || o.bank || ''} <span className="mono" style={NW}>{maskAcct(o.acctNo)}</span><br /><BankChip O={o} /></TableCell>
                  <TableCell className="small">{ps.length ? ps.map((p, i) => <span key={p.id}>{i ? <br /> : null}{p.name}</span>) : '—'}</TableCell>
                  <TableCell className="num">{inr(rent)}</TableCell>
                  <TableCell><Portal accounts={U.rows.filter(u => u.ownerId === o.id)} /></TableCell>
                  <TableCell sx={STICKY}><div className="actions"><Btn sm onClick={() => viewOwnerProfile(o.id)}>Details</Btn><Btn sm onClick={() => editOwner(o.id)}>Edit</Btn></div></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </TableCard></Refreshing>
      ) : <Empty panel>{L.message || 'No owners found.'}</Empty>}
      <Pager list={L} />
    </>
  )
}
