/* Import owners, properties or leases from an Excel file (admin and staff). Opened from the Owners, Properties or
   Leases page (d.sheet), each with its own one-sheet template; a file with several sheets is imported as well.
   1. Download the template — dropdowns filled with the system's own values (owner types, statuses, existing owners…).
   2. Choose the filled-in file → the API answers with a row-by-row preview (create / already there / error).
   3. Import — only the rows marked "New" are saved; existing records are never changed. */
import { useState } from 'react'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import DrawerLayout from '../../components/app/DrawerLayout'
import { closeDrawer, toast } from '../../store/store'
import { callApi } from '../../app/store'
import { refreshPortfolio } from '../../app/bootstrap'
import { Btn, Banner, Section, Kpis, Kpi } from '../../components/ui/Layout'
import { StatusChip } from '../../components/ui/Status'
import { FileInput } from '../../components/form/Fields'

const SHEETS = [['owners', 'Owners'], ['properties', 'Properties'], ['leases', 'Leases']]
const NEEDS = { properties: 'Owners must already be in the system to pick them in the Owner column — add or import owners first.', leases: 'Properties and owners must already be in the system to pick them — add or import them first.' }
const ACTION = { create: ['New', 'ok'], skip: ['Already there', 'idle'], error: ['Error', 'bad'] }
const SX = { '& .MuiTableCell-root': { fontSize: 12.5, verticalAlign: 'top' }, '& .MuiTableCell-head': { fontSize: 11 } }

export default function ImportDrawer({ d }) {
  const sheet = SHEETS.some(([k]) => k === d.sheet) ? d.sheet : 'properties'
  const title = SHEETS.find(([k]) => k === sheet)[1]
  const [file, setFile] = useState(null)
  const [plan, setPlan] = useState(null)
  const [busy, setBusy] = useState('') // 'template' | 'preview' | 'import'
  const [onlyProblems, setOnlyProblems] = useState(false)

  const download = async () => {
    setBusy('template')
    try {
      const blob = await callApi('importTemplate', sheet)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href = url; a.download = `truspace-${sheet}-template.xlsx`; document.body.appendChild(a); a.click(); a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (e) { toast(e.message, 'error') } finally { setBusy('') }
  }

  const choose = async e => {
    const f = e.target.files && e.target.files[0]
    setFile(f || null); setPlan(null)
    if (!f) return
    setBusy('preview')
    try { const r = await callApi('importPreview', f); setPlan(r.data); toast(r.message, r.data.total.create ? 'info' : 'warning') }
    catch (e) { toast(e.message, 'error') }
    finally { setBusy('') }
  }

  const run = async () => {
    if (!file || !plan?.total.create) return
    setBusy('import')
    try {
      const r = await callApi('importCommit', file)
      toast(r.message, 'success')
      closeDrawer()
      refreshPortfolio({ force: true })
    } catch (e) { toast(e.message, 'error'); if (e.status === 400 && file) { try { setPlan((await callApi('importPreview', file)).data) } catch { /* keep the old preview */ } } }
    finally { setBusy('') }
  }

  const t = plan?.total
  return (
    <DrawerLayout title={`Import ${title.toLowerCase()} from Excel`} sub={`One row per ${title.toLowerCase().replace(/ies$/, 'y').replace(/s$/, '')} · existing records are never changed`}
      footer={<><Btn onClick={closeDrawer}>Close</Btn><Btn primary onClick={run} disabled={!!busy || !t?.create}>{busy === 'import' ? 'Importing…' : t?.create ? `Import ${t.create} new record${t.create === 1 ? '' : 's'}` : 'Import'}</Btn></>}>
      <Section title="1. Get the template" sub={`The ${title} sheet with the portal's own dropdown values${NEEDS[sheet] ? '. ' + NEEDS[sheet] : '.'}`}>
        <div className="filters" style={{ alignItems: 'center', gap: 12 }}>
          <Btn onClick={download} disabled={busy === 'template'}>{busy === 'template' ? 'Preparing…' : 'Download template (.xlsx)'}</Btn>
          <span className="small muted">Orange headers are required. Hover a header in Excel for what goes in the column.</span>
        </div>
      </Section>
      <Section title="2. Upload the filled-in file" sub="You get a row-by-row check first. Nothing is saved until you press Import.">
        <FileInput id="imp-file" name="file" accept=".xlsx" onChange={choose}>
          <span>{file ? file.name : 'Choose the .xlsx file'}</span>
        </FileInput>
        {busy === 'preview' ? <p className="small muted" style={{ margin: 0 }}>Checking the file…</p> : null}
      </Section>
      {plan ? (
        <Section title="3. Check the rows" sub="New rows are added. Rows already in the system are skipped, never changed. Rows with errors are left out — fix them in the file and upload it again."
          actions={t.error ? <label className="small" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={onlyProblems} onChange={e => setOnlyProblems(e.target.checked)} /> Only rows with errors</label> : null}>
          <Kpis>
            <Kpi label="New" value={t.create} sub="will be added" />
            <Kpi label="Already there" value={t.skip} sub="skipped" />
            <Kpi label="Errors" value={t.error} sub="left out" alert={t.error > 0} />
          </Kpis>
          {!t.create ? <Banner tone={t.error ? 'bad' : undefined}>{t.error ? 'Nothing can be added yet. Fix the rows marked Error and upload the file again.' : 'Everything in this file is already in the system.'}</Banner> : null}
          {SHEETS.map(([k, title]) => {
            const s = plan[k]; if (!s || !s.rows.length) return null
            const rows = onlyProblems ? s.rows.filter(r => r.action === 'error') : s.rows
            if (!rows.length) return null
            return (
              <div key={k}>
                <div className="eyebrow" style={{ margin: '8px 0 6px' }}>{title} · {s.create} new{s.skip ? ` · ${s.skip} already there` : ''}{s.error ? ` · ${s.error} with errors` : ''}</div>
                <div className="tbl-wrap">
                  <Table size="small" className="otable" sx={SX}>
                    <TableHead><TableRow><TableCell style={{ width: 52 }}>Row</TableCell><TableCell>Record</TableCell><TableCell style={{ width: 110 }}>Result</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
                    <TableBody>
                      {rows.map(r => { const [label, kind] = ACTION[r.action] || ['', 'idle']; return (
                        <TableRow key={r.row}>
                          <TableCell className="code">{r.row}</TableCell>
                          <TableCell><b>{r.label || '—'}</b></TableCell>
                          <TableCell><StatusChip label={label} k={kind} /></TableCell>
                          <TableCell className={r.action === 'error' ? '' : 'muted'} style={r.action === 'error' ? { color: 'var(--bad)' } : undefined}>{r.note || (r.action === 'create' ? 'Will be added' : '')}</TableCell>
                        </TableRow>) })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          })}
        </Section>
      ) : null}
      <p className="hint" style={{ margin: 0 }}>Photos and documents are not part of the file; add them from each record after the import. Owners added here get no portal login until you give them access on Portal access.</p>
    </DrawerLayout>
  )
}
