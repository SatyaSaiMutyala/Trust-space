/* Add / edit owner, or the owner's own "Update my details" (prototype DRAWERS.owner + SUBMIT.owner). */
import { useState } from 'react'
import { isOwner, owner, closeDrawer, useStore } from '../../store/store'
import { fmtD } from '../../domain/utils'
import DrawerLayout from '../../components/app/DrawerLayout'
import { Btn, Banner } from '../../components/ui/Layout'
import { FileLinks } from '../../components/ui/Media'
import { FormGrid, Cell, SectionTitle, TextInput, SelectInput, CheckField, FileInput } from '../../components/form/Fields'
import { submitOwner } from './actions'

function FileSlot({ id, name, f, label }) {
  return (
    <FileInput id={id} name={name} label={label} full={false} accept="image/*,application/pdf">
      {f ? <FileLinks files={[f]} /> : <span className="muted small">Not uploaded</span>}
    </FileInput>
  )
}

export default function OwnerFormDrawer({ d }) {
  useStore()
  const [O] = useState(() => d.id ? owner(d.id) : { kind: 'Individual', prefContact: 'WhatsApp', lang: 'English', acctType: 'Savings', noticeSame: true })
  const o = isOwner(); const a = O.addr || { line: O.address || '' }; const na = O.noticeAddr || {}; const em = O.emergency || {}; const rp = O.rep || {}
  const [same, setSame] = useState(O.noticeSame !== false)
  const [party, setParty] = useState(O.party === 'Co-share' ? 'Co-share' : 'Owner')
  const cs = party === 'Co-share'
  const [busy, setBusy] = useState(false)
  const onSubmit = async e => { e.preventDefault(); setBusy(true); try { await submitOwner(new FormData(e.currentTarget), d.id) } finally { setBusy(false) } }
  const tel = { type: 'tel', inputMode: 'tel' }
  return (
    <DrawerLayout
      title={o ? 'Update my details' : d.id ? 'Edit owner' : 'Add owner'}
      sub={o ? 'Changes to bank details are re-verified by TrustLab before the next rent payment.' : 'Everything TrustLab needs to pay rent, raise documents and reach the owner or their representative.'}
      footer={<><Btn onClick={closeDrawer}>Cancel</Btn><Btn primary type="submit" form="f-own" disabled={busy}>{o ? 'Save my details' : 'Save owner'}</Btn></>}>
      <form id="f-own" onSubmit={onSubmit}>
        <FormGrid>
          <SectionTitle first>1 · Identity &amp; tax</SectionTitle>
          <SelectInput id="ow-party" name="party" label="This person is" value={party} onChange={e => setParty(e.target.value)} disabled={o} options={[['Owner', 'Owner — on the lease agreement'], ['Co-share', 'Co-share — paid a share of the rent, not on the agreement']]} hint={cs ? 'Gets their share of the rent with TDS on their PAN. No invoice (a payment voucher is generated), no GST, no deposit by default.' : 'Signs the agreement, invoices their share, GST as registered.'} full />
          <TextInput id="ow-name" name="name" label="Name as per PAN" defaultValue={O.name} required readOnly={o} full />
          <SelectInput id="ow-kind" name="kind" label="Type" defaultValue={O.kind} disabled={o} options={['Individual', 'HUF', 'Company', 'LLP', 'Firm', 'Trust']} />
          <TextInput id="ow-pre" name="invPrefix" label="Invoice prefix" defaultValue={O.invPrefix} maxLength={5} placeholder="SRK" hint="Used for invoices generated in the portal" />
          <TextInput id="ow-pan" name="pan" label="PAN" defaultValue={O.pan} maxLength={10} upper placeholder="ABCDE1234F" />
          {cs ? null : <TextInput id="ow-gst" name="gstin" label="GSTIN" defaultValue={O.gstin} maxLength={15} upper hint="Leave blank if unregistered (TrustLab pays GST under RCM)" />}
          <FileSlot id="ow-panf" name="panFile" f={O.panFile} label="PAN card copy" />
          {cs ? null : <FileSlot id="ow-gstf" name="gstFile" f={O.gstFile} label="GST certificate (if registered)" />}

          <SectionTitle>2 · Contact</SectionTitle>
          <TextInput id="ow-ph" name="phone" label="Mobile (primary)" defaultValue={O.phone} {...tel} required placeholder="+91 98480 11223" />
          <TextInput id="ow-ph2" name="phone2" label="Alternate phone" defaultValue={O.phone2} {...tel} />
          <TextInput id="ow-wa" name="whatsapp" label="WhatsApp number" defaultValue={O.whatsapp} {...tel} placeholder="Same as mobile if blank" />
          <TextInput id="ow-em" name="email" label="Email" type="email" defaultValue={O.email} required />
          <TextInput id="ow-em2" name="email2" label="Alternate email (accounts / CA)" type="email" defaultValue={O.email2} />
          <SelectInput id="ow-pc" name="prefContact" label="Preferred contact" defaultValue={O.prefContact} options={['WhatsApp', 'Phone call', 'Email', 'SMS']} />
          <SelectInput id="ow-lang" name="lang" label="Preferred language" defaultValue={O.lang} options={['English', 'Telugu', 'Hindi', 'Tamil', 'Kannada', 'Other']} />
          <TextInput id="ow-hrs" name="callHours" label="Best time to call" defaultValue={O.callHours} placeholder="e.g. 10 am – 6 pm" />

          <SectionTitle>3 · Address</SectionTitle>
          <TextInput id="ow-a1" name="addrLine" label="Residential / billing address" defaultValue={a.line} required full />
          <TextInput id="ow-ac" name="addrCity" label="City" defaultValue={a.city} />
          <TextInput id="ow-as" name="addrState" label="State" defaultValue={a.state} />
          <TextInput id="ow-ap" name="addrPin" label="PIN code" defaultValue={a.pin} inputMode="numeric" maxLength={6} />
          <CheckField id="ow-ns" name="noticeSame" label="Legal notices go to the same address" defaultChecked={O.noticeSame !== false} onChange={e => setSame(e.target.checked)} />
          <Cell full sx={same ? { display: 'none' } : undefined}>
            <FormGrid>
              <TextInput id="ow-n1" name="nLine" label="Address for notices" defaultValue={na.line} full />
              <TextInput id="ow-nc" name="nCity" label="City" defaultValue={na.city} />
              <TextInput id="ow-nst" name="nState" label="State" defaultValue={na.state} />
              <TextInput id="ow-np" name="nPin" label="PIN code" defaultValue={na.pin} inputMode="numeric" maxLength={6} />
              <TextInput id="ow-nat" name="nAttn" label="Attention / care of" defaultValue={na.attn} placeholder="e.g. Advocate R. Rao" />
            </FormGrid>
          </Cell>
          <TextInput id="ow-ne" name="noticeEmail" label="Email for notices" type="email" defaultValue={O.noticeEmail} placeholder="If different from main email" full />

          <SectionTitle>4 · Emergency contact</SectionTitle>
          <TextInput id="ow-en" name="emName" label="Name" defaultValue={em.name} />
          <TextInput id="ow-er" name="emRel" label="Relationship" defaultValue={em.rel} placeholder="Son, manager, caretaker…" />
          <TextInput id="ow-ep" name="emPhone" label="Phone" defaultValue={em.phone} {...tel} />
          <TextInput id="ow-ea" name="emNear" label="Lives / works near the property?" defaultValue={em.near} placeholder="e.g. 2 km away — has spare keys" />

          <SectionTitle>5 · Authorised representative (if someone acts for the owner)</SectionTitle>
          <TextInput id="ow-rn" name="repName" label="Name" defaultValue={rp.name} />
          <TextInput id="ow-rr" name="repRel" label="Capacity" defaultValue={rp.rel} placeholder="PoA holder, property manager, director…" />
          <TextInput id="ow-rph" name="repPhone" label="Phone" defaultValue={rp.phone} {...tel} />
          <TextInput id="ow-rem" name="repEmail" label="Email" type="email" defaultValue={rp.email} />
          <FileSlot id="ow-poa" name="poaFile" f={rp.poa} label="Power of attorney / board resolution" />
          <TextInput id="ow-co" name="coOwners" label="Co-owners" multiline defaultValue={O.coOwners || ''} placeholder="One per line: name, share %, PAN" full hint="All co-owners must sign the lease" />

          <SectionTitle>6 · Bank details for rent</SectionTitle>
          {O.bankPending ? <Cell full><Banner>Bank details were changed on {fmtD(O.bankChangedOn)} and are <b>awaiting TrustLab verification</b>. Rent is held until verified.</Banner></Cell> : null}
          <TextInput id="ow-bh" name="acctHolder" label="Account holder name" defaultValue={O.acctHolder || O.name} full hint="Must match the owner or a co-owner" />
          <TextInput id="ow-bn" name="bankName" label="Bank" defaultValue={O.bankName || (O.bank || '').split(',')[0]} />
          <TextInput id="ow-bb" name="bankBranch" label="Branch" defaultValue={O.bankBranch || ((O.bank || '').split(',')[1] || '').trim()} />
          <TextInput id="ow-ba" name="acctNo" label="Account number" defaultValue={O.acctNo} inputMode="numeric" autoComplete="off" />
          <TextInput id="ow-ba2" name="acctNo2" label="Confirm account number" defaultValue={O.acctNo} inputMode="numeric" autoComplete="off" />
          <TextInput id="ow-if" name="ifsc" label="IFSC" defaultValue={O.ifsc} maxLength={11} upper placeholder="HDFC0001234" />
          <SelectInput id="ow-at" name="acctType" label="Account type" defaultValue={O.acctType} options={['Savings', 'Current', 'NRO', 'Other']} />
          <TextInput id="ow-upi" name="upi" label="UPI ID (optional)" defaultValue={O.upi} placeholder="name@bank" />
          <FileSlot id="ow-chq" name="chequeFile" f={O.chequeFile} label="Cancelled cheque / bank letter" />
          {o ? null : <CheckField id="ow-bv" name="bankVerified" label="Bank details verified by TrustLab Accounts (cheque matched / penny-drop done)" defaultChecked={O.bankVerified && !O.bankPending} />}
          {O.bankVerified && !O.bankPending ? <Cell full><p className="small muted" style={{ margin: 0 }}>Verified by {O.bankVerifiedBy || ''} on {fmtD(O.bankVerifiedOn)}</p></Cell> : null}
        </FormGrid>
      </form>
    </DrawerLayout>
  )
}
