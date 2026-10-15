/* Owner actions and form submission (prototype ACT.verifyBank, SUBMIT.owner). */
import { S, owner, save, toast, isOwner, closeDrawer, drawDrawer } from '../../store/store'
import { TODAY, nowISO } from '../../domain/utils'
import { uploadFiles } from '../../services/files'

export async function verifyBank(id) {
  const O = owner(id); Object.assign(O, { bankVerified: true, bankPending: false, bankVerifiedBy: 'TrustLab Accounts', bankVerifiedOn: TODAY })
  await save('owners', O); drawDrawer()
}

export async function submitOwner(fd, id) {
  const old = id ? owner(id) : {}
  const g = k => (fd.get(k) || '').trim()
  const pan = g('pan').toUpperCase(), gstin = g('gstin').toUpperCase(), ifsc = g('ifsc').toUpperCase(), acct = g('acctNo').replace(/\s/g, '')
  const err = []
  if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) err.push('PAN should look like ABCDE1234F')
  if (gstin && !/^[0-9]{2}[A-Z0-9]{13}$/.test(gstin)) err.push('GSTIN should be 15 characters starting with the state code')
  if (gstin && pan && gstin.slice(2, 12) !== pan) err.push('GSTIN does not contain this PAN')
  if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) err.push('IFSC should look like HDFC0001234')
  if (acct && acct !== g('acctNo2').replace(/\s/g, '')) err.push('Account numbers do not match')
  if (acct && !/^[0-9]{9,18}$/.test(acct)) err.push('Account number should be 9–18 digits')
  for (const [k, l] of [['addrPin', 'PIN code'], ['nPin', 'Notice PIN code']]) if (g(k) && !/^[1-9][0-9]{5}$/.test(g(k))) err.push(`${l} should be 6 digits`)
  if (err.length) { toast(err[0], 'warning'); return }
  const up = async n => { const fl = fd.get(n); if (fl && fl.size) { const r = await uploadFiles([fl], 1); return r[0] } return undefined }
  const panFile = await up('panFile'), gstFile = await up('gstFile'), chequeFile = await up('chequeFile'), poa = await up('poaFile')
  const bankKeys = { acctHolder: g('acctHolder'), bankName: g('bankName'), bankBranch: g('bankBranch'), acctNo: acct, ifsc, acctType: g('acctType') || old.acctType, upi: g('upi') }
  const bankChanged = ['acctHolder', 'acctNo', 'ifsc', 'bankName'].some(k => (old[k] || '') !== (bankKeys[k] || '')) && !!old.acctNo
  const O = Object.assign({}, old, {
    name: isOwner() ? old.name : g('name'), kind: fd.get('kind') || old.kind, invPrefix: g('invPrefix'), pan, gstin,
    phone: g('phone'), phone2: g('phone2'), whatsapp: g('whatsapp'), email: g('email'), email2: g('email2'), prefContact: g('prefContact'), lang: g('lang'), callHours: g('callHours'),
    addr: { line: g('addrLine'), city: g('addrCity'), state: g('addrState'), pin: g('addrPin') }, noticeSame: !!fd.get('noticeSame'),
    noticeAddr: { line: g('nLine'), city: g('nCity'), state: g('nState'), pin: g('nPin'), attn: g('nAttn') }, noticeEmail: g('noticeEmail'),
    emergency: { name: g('emName'), rel: g('emRel'), phone: g('emPhone'), near: g('emNear') },
    rep: Object.assign({}, old.rep, { name: g('repName'), rel: g('repRel'), phone: g('repPhone'), email: g('repEmail') }, poa ? { poa } : {}),
    coOwners: g('coOwners'), ...bankKeys,
  })
  O.address = [O.addr.line, O.addr.city, O.addr.state, O.addr.pin].filter(Boolean).join(', ')
  O.bank = [O.bankName, O.bankBranch].filter(Boolean).join(', ')
  if (panFile) O.panFile = panFile; if (gstFile) O.gstFile = gstFile; if (chequeFile) O.chequeFile = chequeFile
  O.invPrefix = (O.invPrefix || O.name.split(/\s+/).map(w => w[0]).join('').slice(0, 3)).toUpperCase()
  if (isOwner()) {
    if (bankChanged || (!old.acctNo && acct)) {
      O.bankPending = true; O.bankChangedOn = TODAY; O.bankVerified = false
      save('messages', { propertyId: (S.properties.find(p => p.ownerId === O.id) || {}).id, ownerId: O.id, from: 'owner', by: O.name, kind: 'Approval request', text: `I have updated my bank details for rent (${O.bankName}, IFSC ${O.ifsc}, account ending ${acct.slice(-4)}). Please verify before the next payment.`, at: nowISO(), files: chequeFile ? [chequeFile] : [], read: { owner: true } }, true)
    }
  } else {
    const v = !!fd.get('bankVerified')
    if (v && (!old.bankVerified || old.bankPending || bankChanged)) { O.bankVerified = true; O.bankPending = false; O.bankVerifiedBy = 'TrustLab Accounts'; O.bankVerifiedOn = TODAY } else if (!v) { O.bankVerified = false }
    if (bankChanged && !v) { O.bankPending = true; O.bankChangedOn = TODAY }
  }
  await save('owners', O); closeDrawer()
}
