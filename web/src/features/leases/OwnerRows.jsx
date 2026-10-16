/* Co-owner rows of the lease form — "Owners & share of payments" (prototype ownerRowHTML + ownerRowsHTML).
   Shares are entered as ₹ amounts and stored as % (see actions.js). Every row's fields share the names
   o-id, o-rent, o-maint, o-dep, o-adv, o-gst, so readOwnerAmounts() reads them in order with FormData. */
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableFooter from '@mui/material/TableFooter'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S } from '../../store/store'
import { Btn } from '../../components/ui/Layout'
import { TextInput, SelectInput, CheckField } from '../../components/form/Fields'

const G = [['', 'As in section 6'], ['Forward', 'Registered — GST on invoice'], ['RCM', 'Unregistered — TrustLab pays RCM'], ['None', 'No GST']]
const KS = ['rent', 'maint', 'dep', 'adv']
const SX = { '& .MuiTableCell-root': { fontSize: 12.5, verticalAlign: 'middle' }, '& .MuiTableCell-head': { fontSize: 11 }, '& .MuiTableCell-footer': { color: 'var(--ink)' } }
const LABEL = { rent: 'Rent', maint: 'Maintenance', dep: 'Deposit', adv: 'Advance' }
const NUM_SX = { width: 112, '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '7px' } }
const SEL_SX = { minWidth: 200, '& select': { py: '7px' } }

/** rows = [{ key, o: { ownerId, rent, maint, dep, adv (₹), gst } }]; sums = ownerSums(form). A sole owner's amounts follow the lease totals. */
export default function OwnerRows({ rows, same, sums, onAdd, onDel }) {
  return (
    <>
      <div className="tbl-wrap">
        <Table size="small" className="otable oedit" sx={SX}>
          <TableHead><TableRow>
            <TableCell>Owner (as per title)</TableCell><TableCell>Rent (₹/mo)</TableCell><TableCell>Maint. (₹/mo)</TableCell><TableCell>Deposit (₹)</TableCell><TableCell>Advance (₹)</TableCell><TableCell>GST status</TableCell><TableCell />
          </TableRow></TableHead>
          <TableBody id="ls-owners">
            {rows.map(({ key, o }) => (
              <TableRow key={key} className="orow" data-key={key}>
                <TableCell><SelectInput grid={false} name="o-id" aria-label="Owner" placeholder="— choose owner —" options={S.owners.map(x => [x.id, x.name + (x.pan ? ' · ' + x.pan : '')])} defaultValue={o.ownerId || ''} sx={SEL_SX} /></TableCell>
                {KS.map(k => <TableCell key={k}><TextInput grid={false} type="number" name={`o-${k}`} min="0" step="1" defaultValue={o[k] ?? ''} htmlInput={{ 'aria-label': `${LABEL[k]} amount (₹)` }} sx={NUM_SX} /></TableCell>)}
                <TableCell><SelectInput grid={false} name="o-gst" aria-label="GST" options={G} defaultValue={o.gst || ''} sx={SEL_SX} /></TableCell>
                <TableCell><Btn sm ghost onClick={() => onDel(key)} aria-label="Remove owner">✕</Btn></TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter><TableRow>
            <TableCell><Btn sm onClick={onAdd}>＋ Add co-owner</Btn></TableCell>
            {KS.map(k => <TableCell key={k} className="num small" id={`ls-sum-${k}`} sx={{ color: `${sums[k]?.color || 'var(--muted)'} !important` }}>{sums[k]?.text || ''}</TableCell>)}
            <TableCell colSpan={2} />
          </TableRow></TableFooter>
        </Table>
      </div>
      <div className="filters" style={{ marginTop: 6 }}>
        <CheckField grid={false} id="ls-same" label="Same split for every charge" defaultChecked={same} />
        <CheckField grid={false} id="ls-tpo" name="tdsPerOwner" label="Test TDS threshold on each co-owner’s share" defaultChecked />
      </div>
      <p className="hint small muted" style={{ margin: '4px 0 0' }}>Each owner invoices and is paid separately. Enter each owner’s amount; the lease’s monthly rent, maintenance, security deposit and advance rent (sections 3–5) are filled in as the sum of these, and escalations are shared in the same proportion. Add co-owners in Owners first if they are not listed.</p>
    </>
  )
}
