/* Owner profile sections (prototype ownerProfile). full = show the whole account number. */
import { useStore } from '../../store/store'
import { maskAcct, fmtAddr, noticeAddrOf, bankState, tdsRate, panValid, certFor } from '../../domain/lease'
import { TODAY } from '../../domain/utils'
import { StatusChip } from '../../components/ui/Status'
import { FileLinks } from '../../components/ui/Media'
import Box from '@mui/material/Box'

const F = (l, v) => <div className="fact"><div className="l">{l}</div><div className="v">{v || <span className="muted">—</span>}</div></div>
/* Wide fact (e.g. the long bank-status chip): takes the whole row on phones so it never sticks out of the two-column grid. */
const FW = (l, v) => <Box className="fact" sx={{ minWidth: 0, '@media (max-width:600px)': { gridColumn: '1/-1' } }}><div className="l">{l}</div><div className="v">{v || <span className="muted">—</span>}</div></Box>
const Sec = ({ t, children }) => <div className="osec"><div className="eyebrow">{t}</div><div className="facts">{children}</div></div>

export function BankChip({ O }) { const [l, k] = bankState(O); return <StatusChip label={l} k={k} /> }

export default function OwnerProfile({ O, full }) {
  useStore()
  const em = O.emergency || {}, rp = O.rep || {}
  const co = O.coOwners ? String(O.coOwners).split('\n').flatMap((ln, i) => i ? [<br key={i} />, ln] : [ln]) : ''
  return (
    <>
      <Sec t="Identity & tax">
        {F('Name as per PAN', O.name)}{F('Type', O.party === 'Co-share' ? `${O.kind} · Co-share` : O.kind)}{F('PAN', <span className="mono">{O.pan || ''}</span>)}{F('GSTIN', <span className="mono">{O.party === 'Co-share' ? 'Not applicable (co-share)' : O.gstin || 'Unregistered'}</span>)}
        {F('TDS rate today', `${tdsRate(O.id, TODAY)}%${!panValid(O) ? ' — no valid PAN' : certFor(O, TODAY) ? ' — lower-deduction certificate' : ''}`)}
        {F('KYC copies', [O.panFile ? 'PAN' : '', O.gstFile ? 'GST' : ''].filter(Boolean).join(', ') || <span className="muted">None uploaded</span>)}
      </Sec>
      <Sec t="Contact">
        {F('Mobile', O.phone)}{F('Alternate', O.phone2)}{F('WhatsApp', O.whatsapp || O.phone)}{F('Email', O.email)}{F('Alternate email', O.email2)}{F('Prefers', [O.prefContact, O.lang, O.callHours].filter(Boolean).join(' · '))}
      </Sec>
      <Sec t="Addresses">
        {F('Residential / billing', fmtAddr(O.addr) || O.address)}
        {F('Address for notices', <>{noticeAddrOf(O)}{O.noticeSame === false ? '' : <> <span className="small muted">(same as billing)</span></>}</>)}
        {F('Email for notices', O.noticeEmail || O.email)}
      </Sec>
      <Sec t="Emergency & representative">
        {F('Emergency contact', [em.name, em.rel, em.phone].filter(Boolean).join(' · '))}{F('Near the property', em.near)}
        {F('Authorised representative', [rp.name, rp.rel, rp.phone, rp.email].filter(Boolean).join(' · '))}
        {F('PoA / resolution', rp.poa ? <FileLinks files={[rp.poa]} /> : '')}
        {F('Co-owners', co.length ? <>{co}</> : '')}
      </Sec>
      <Sec t="Bank for rent">
        {F('Account holder', O.acctHolder)}{F('Bank / branch', [O.bankName, O.bankBranch].filter(Boolean).join(', ') || O.bank)}
        {F('Account', <span className="mono">{full ? (O.acctNo || '—') : maskAcct(O.acctNo)}</span>)}{F('IFSC', <span className="mono">{O.ifsc || ''}</span>)}
        {F('Type / UPI', [O.acctType, O.upi].filter(Boolean).join(' · '))}
        {FW('Status', <><BankChip O={O} />{O.chequeFile ? <> <FileLinks files={[O.chequeFile]} /></> : null}</>)}
      </Sec>
    </>
  )
}
