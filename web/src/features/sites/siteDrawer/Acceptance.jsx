/* Acceptance & approval: both business-head forms (accept / return) and the CMD approval. */
import { useState } from 'react'
import Box from '@mui/material/Box'
import { ACCEPTORS } from '../../../domain/constants'
import { fmtD, fmtDT } from '../../../domain/utils'
import { Panel, Btn } from '../../../components/ui/Layout'
import { TextInput } from '../../../components/form/Fields'
import { siteAccept } from './siteActions'
import { H3 } from './parts'

function AcceptForm({ st, who }) {
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const act = e.nativeEvent.submitter?.value || 'accept'
    setBusy(true); try { await siteAccept(st.id, who, fd, act) } finally { setBusy(false) }
  }
  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 6 }}>
      <TextInput grid={false} name="name" id={`ac-n-${who}`} placeholder="Name" required htmlInput={{ 'aria-label': 'Name' }} />
      <TextInput grid={false} name="note" id={`ac-c-${who}`} placeholder="Comments (required to return)" htmlInput={{ 'aria-label': 'Comments' }} />
      <div className="actions"><Btn type="submit" sm primary name="act" value="accept" disabled={busy}>Accept</Btn><Btn type="submit" sm danger name="act" value="return" disabled={busy}>Return</Btn></div>
    </form>
  )
}

export default function Acceptance({ st, fr, stage }) {
  const acc = st.accept || {}
  return (
    <Panel title={<H3>Acceptance &amp; approval</H3>} sub={`Both business heads accept before ${fr ? 'the location' : 'the deal'} goes to the CMD.`}>
      <Box className="sigs" sx={{ '&.sigs': { gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,210px),1fr))' } }}>
        {ACCEPTORS.map(([k, l]) => {
          const a = acc[k]
          return (
            <div key={k} className={`sig ${a && a.ok ? '' : 'pending'}`}>
              <span className="eyebrow">{l}</span>
              {a && a.ok ? <><b>Accepted</b><span className="small muted">{a.name} · {fmtDT(a.at)}</span>{a.note ? <span className="small">{a.note}</span> : null}</>
                : stage === 'Acceptance' ? <AcceptForm st={st} who={k} /> : <span className="muted small">Pending</span>}
            </div>
          )
        })}
        <div className={`sig ${st.approval ? '' : 'pending'}`}>
          <span className="eyebrow">CMD approval</span>
          {st.approval ? <><b>Approved</b><span className="small muted">{st.approval.by} · {fmtDT(st.approval.at)}</span><span className="small">{st.approval.note || ''}</span></> : <span className="muted small">After both acceptances</span>}
        </div>
      </Box>
      {(st.returns || []).length ? <div className="small" style={{ marginTop: 10 }}><b>Returned earlier:</b> {st.returns.map(r => `${r.by} — ${r.note} (${fmtD(r.at)})`).join('; ')}</div> : null}
    </Panel>
  )
}
