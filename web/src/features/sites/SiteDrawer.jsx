/* DRAWERS.site — site evaluation drawer, ported from reference/TruSpace.html. Sections live in ./siteDrawer/. */
import { useState } from 'react'
import { S, useStore, isFranchisee, openDrawer } from '../../store/store'
import { siteStage, siteScore, siteProblems, isFr, reqOf } from '../../domain/site'
import { ACCEPTORS } from '../../domain/constants'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Banner, Btn, ActLink, Panel } from '../../components/ui/Layout'
import { StatusChip, Timeline } from '../../components/ui/Status'
import { FormGrid, TextInput, Cell } from '../../components/form/Fields'
import StageBar from './siteDrawer/StageBar'
import FrontView from './siteDrawer/FrontView'
import SiteDetails from './siteDrawer/SiteDetails'
import Catchment from './siteDrawer/Catchment'
import Signage from './siteDrawer/Signage'
import Earthing from './siteDrawer/Earthing'
import SpacePlan from './siteDrawer/SpacePlan'
import Checklist from './siteDrawer/Checklist'
import Terms from './siteDrawer/Terms'
import Acceptance from './siteDrawer/Acceptance'
import Decision from './siteDrawer/Decision'
import { H3 } from './siteDrawer/parts'
import { ijump, siteGo, siteRejectShow, siteSendAccept, siteApprove, frSubmit, dlSite, siteReject } from './siteDrawer/siteActions'

function RejectForm({ st, onDone }) {
  const [busy, setBusy] = useState(false)
  const submit = async e => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const act = e.nativeEvent.submitter?.value || 'Rejected'
    setBusy(true); try { await siteReject(st.id, fd, act); onDone() } finally { setBusy(false) }
  }
  return (
    <Panel id="srej">
      <form onSubmit={submit}>
        <FormGrid>
          <TextInput id="sj-r" name="reason" label="Reason" multiline full required />
          <Cell full><div className="actions"><Btn type="submit" danger name="act" value="Rejected" disabled={busy}>Reject site</Btn><Btn type="submit" name="act" value="On hold" disabled={busy}>Put on hold</Btn></div></Cell>
        </FormGrid>
      </form>
    </Panel>
  )
}

export default function SiteDrawer({ d }) {
  useStore()
  const [rej, setRej] = useState(false)
  const st = S.sites.find(x => x.id === d.id)
  if (!st) return <DrawerLayout title="Site"><div className="empty">Not found.</div></DrawerLayout>
  const stage = siteStage(st); const sc = siteScore(st); const probs = siteProblems(st)
  const fr = isFr(st); const frU = isFranchisee()
  const locked = frU || !['Scouted', 'Scrutiny'].includes(stage)
  const t = st.terms || {}
  const clock = !['Scouted', 'Scrutiny'].includes(stage) || (frU && stage !== 'Scouted')
  const slock = clock
  const acc = st.accept || {}
  const termsOk = t.rent && t.deposit && t.term && t.start

  const foot = []
  if (!frU) foot.push(<Btn key="dl" onClick={() => dlSite(st.id)}>Download evaluation</Btn>)
  if (frU) {
    if (stage === 'Scouted') foot.push(<Btn key="fs" primary onClick={() => frSubmit(st.id)}>Submit to TrustLab for assessment</Btn>)
    else foot.push(<span key="fm" className="small muted" style={{ alignSelf: 'center' }}>{['Approved', 'Opened'].includes(stage) ? 'Approved by TrustLab' : stage === 'Rejected' ? 'Not approved by TrustLab' : 'With TrustLab for assessment'}</span>)
  } else {
    if (!['Rejected', 'On hold', 'Agreement', 'Take-over', 'Operational', 'Opened'].includes(stage) && !(fr && stage === 'Approved')) foot.push(<Btn key="rj" danger onClick={() => siteRejectShow(() => setRej(true))}>Reject / hold</Btn>)
    if (stage === 'Scouted') foot.push(<Btn key="go" primary onClick={() => siteGo(st.id, 'Scrutiny')}>Start scrutiny</Btn>)
    if (stage === 'Scrutiny') foot.push(<Btn key="go" primary disabled={!!(probs.length || sc.crit.length)} onClick={() => siteGo(st.id, 'Shortlisted')}>Shortlist</Btn>)
    if (stage === 'Shortlisted') foot.push(<Btn key="back" onClick={() => siteGo(st.id, 'Scrutiny')}>Back to scrutiny</Btn>, fr
      ? <Btn key="sa" primary onClick={() => siteSendAccept(st.id)}>Send for acceptance</Btn>
      : <Btn key="neg" primary onClick={() => siteGo(st.id, 'Negotiation')}>Start negotiation</Btn>)
    if (stage === 'Negotiation') foot.push(<Btn key="sa" primary disabled={!termsOk} onClick={() => siteSendAccept(st.id)}>Send for acceptance</Btn>)
    if (stage === 'Acceptance') foot.push(<Btn key="ap" primary disabled={!ACCEPTORS.every(([k]) => acc[k] && acc[k].ok)} onClick={() => siteApprove(st.id)}>{fr ? 'Approve location (CMD)' : 'Approve deal (CMD)'}</Btn>)
    if (['Rejected', 'On hold'].includes(stage)) foot.push(<Btn key="re" primary onClick={() => siteGo(st.id, st.prevStage || 'Scrutiny')}>Reopen</Btn>)
  }

  const rq = reqOf(st)
  const sub = <>
    <span className="mono">{st.code}</span>
    {rq ? <> · for <ActLink onClick={() => openDrawer({ kind: 'req', id: rq.id })}>{rq.code}</ActLink> {rq.purpose} in {rq.area}, {rq.city}</> : ` · ${st.locality}, ${st.city}`}
    {' · '}<StatusChip label={stage} k={stage === 'Rejected' ? 'bad' : 'info'} />
  </>

  return (
    <DrawerLayout title={st.name || 'New site'} sub={sub} footer={foot}>
      <StageBar st={st} />
      {probs.length && stage === 'Scrutiny' ? (
        <Banner>
          <b>{probs.length} item{probs.length > 1 ? 's' : ''} before the site can be shortlisted:</b>
          <ul className="probs">
            {probs.slice(0, 8).map(([k, m], i) => <li key={i}><ActLink href={`#it-${k}`} onClick={() => ijump(k)}>{m}</ActLink></li>)}
            {probs.length > 8 ? <li>…and {probs.length - 8} more</li> : null}
          </ul>
        </Banner>
      ) : null}
      {stage === 'Negotiation' && !termsOk ? <Banner>Fill the agreed rent, deposit, term and possession date to send for acceptance.</Banner> : null}
      {['Acceptance', 'Approved', 'Agreement', 'Take-over', 'Operational', 'Opened'].includes(stage) && !frU ? <Acceptance st={st} fr={fr} stage={stage} /> : null}
      <Decision st={st} stage={stage} fr={fr} frU={frU} />
      <FrontView st={st} />
      <SiteDetails st={st} />
      <Catchment st={st} clock={clock} />
      <Signage st={st} slock={slock} />
      <Earthing st={st} slock={slock} />
      <SpacePlan st={st} slock={slock} />
      <Checklist st={st} locked={locked} />
      <Terms st={st} fr={fr} stage={stage} />
      {rej ? <RejectForm st={st} onDone={() => setRej(false)} /> : null}
      <Panel title={<H3>Activity</H3>}><Timeline entries={(st.log || []).slice().reverse()} /></Panel>
    </DrawerLayout>
  )
}
