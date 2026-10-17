/* Owners of a property — the primary owner plus any co-owners with their share of the rent (%). Rows are uncontrolled
   (names po-id / po-share, read in order with FormData by readPropertyOwners); the shares must total 100. */
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import { S } from '../../store/store'
import { newOwner } from '../../store/actions'
import { Btn, ActLink } from '../../components/ui/Layout'
import { TextInput, SelectInput } from '../../components/form/Fields'

const SX = { '& .MuiTableCell-root': { fontSize: 12.5, verticalAlign: 'middle' }, '& .MuiTableCell-head': { fontSize: 11 } }
const NUM_SX = { width: 96, '& input': { textAlign: 'right', fontFamily: 'var(--f-mono)', py: '7px' } }
const SEL_SX = { minWidth: 220, '& select': { py: '7px' } }

/** Owners of a property: [{ ownerId, share }] — the single `ownerId` of an older record becomes one row at 100%. */
export const propertyOwners = P => (Array.isArray(P?.owners) && P.owners.length ? P.owners : P?.ownerId ? [{ ownerId: P.ownerId, share: 100 }] : [])

/** Even split (whole %), remainder to the first owner — the usual case is equal shares. */
export const evenShares = n => { const b = Math.floor(100 / n); return Array.from({ length: n }, (_, i) => b + (i === 0 ? 100 - b * n : 0)) }

/** rows = [{ key, ownerId, share }]; total = current sum of the share fields (live). */
export default function PropertyOwnerRows({ rows, total, onAdd, onDel }) {
  const multi = rows.length > 1
  const off = multi && Math.round(total) !== 100
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div className="tbl-wrap">
        <Table size="small" className="otable oedit" sx={SX}>
          <TableHead><TableRow>
            <TableCell>{multi ? 'Owner (as per title)' : 'Owner'}</TableCell>{multi ? <TableCell>Share of rent (%)</TableCell> : null}<TableCell />
          </TableRow></TableHead>
          <TableBody id="pr-owners">
            {rows.map((r, i) => (
              <TableRow key={r.key} className="porow">
                <TableCell><SelectInput grid={false} name="po-id" aria-label={i ? 'Co-owner' : 'Owner'} placeholder="— choose owner —" options={S.owners.map(x => [x.id, x.name + (x.pan ? ' · ' + x.pan : '')])} defaultValue={r.ownerId || ''} sx={SEL_SX} /></TableCell>
                {multi ? <TableCell><TextInput grid={false} type="number" name="po-share" min="0" max="100" step="1" defaultValue={r.share ?? ''} htmlInput={{ 'aria-label': 'Share of rent (%)' }} sx={NUM_SX} /></TableCell> : null}
                <TableCell>{multi ? <Btn sm ghost onClick={() => onDel(r.key)} aria-label="Remove owner">✕</Btn> : <input type="hidden" name="po-share" value="100" />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="small" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <Btn sm onClick={onAdd}>+ Add co-owner</Btn>
        <ActLink onClick={newOwner}>Add a new owner</ActLink>
        {multi ? <span className="muted" style={{ marginLeft: 'auto', color: off ? 'var(--bad)' : undefined }}>Shares total <b>{Math.round(total)}%</b>{off ? ' — they must total 100%' : ''}</span> : null}
      </div>
      {multi ? <div className="small muted">The first owner is the main contact. These shares pre-fill the lease’s “Owners &amp; share of payments”, where the ₹ amounts can still be changed.</div> : null}
    </div>
  )
}
