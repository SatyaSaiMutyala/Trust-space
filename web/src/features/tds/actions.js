/* TDS actions (prototype ACT.tdsTab/tdsMonth/tdsChallan/tdsReturn/tds16/tdsCert/tdsQcsv + SUBMIT.tdsChallan/tdsReturn/tds16/tdsCert). */
import { S, UI, owner, save, toast, emit, openDrawer, closeDrawer } from '../../store/store'
import { callApi } from '../../app/store'
import { TODAY, fy, num } from '../../domain/utils'
import { clearSchedCache } from '../../domain/lease'
import { tdsWs, tdsDocs } from '../../domain/tds'
import { uploadFiles, offerDownload } from '../../services/files'

/** UI.tdsv, initialised like the prototype's viewTds. */
export const tdsv = () => (UI.tdsv = UI.tdsv || { tab: 'register', fy: fy(TODAY) })

export const tdsTab = t => { tdsv().tab = t; emit() }
export const setTdsFy = v => { tdsv().fy = v; emit() }
export const tdsMonth = m => openDrawer({ kind: 'tdsMonth', m })
export const tdsChallan = (m, id) => openDrawer({ kind: 'tdsChallan', m, id })
export const tdsReturn = q => openDrawer({ kind: 'tdsReturn', q })
export const tds16 = q => openDrawer({ kind: 'tds16', q })
export const tdsCert = id => openDrawer({ kind: 'tdsCert', id })
export async function tdsQcsv(q) { try { const csv = await callApi('tdsReturnCsv', { fy: tdsv().fy, q: +q }); offerDownload(`TDS-FY${tdsv().fy}-Q${q}-deductees.csv`, csv) } catch (e) { toast(e.message, 'error') } }

/** SUBMIT.tdsChallan */
export async function submitTdsChallan(id, fd) {
  const bsr = (fd.get('bsr') || '').trim(), no = (fd.get('challanNo') || '').trim()
  if (!/^\d{7}$/.test(bsr)) { toast('BSR code should be 7 digits.'); return }
  if (!/^\d{5}$/.test(no)) { toast('Challan serial number should be 5 digits.'); return }
  const old = id ? S.tds.find(x => x.id === id) : { kind: 'challan', ws: tdsWs() }; const up = await uploadFiles(fd.getAll('files').filter(x => x.size), 1)
  const c = Object.assign({}, old, { month: fd.get('month'), amount: num(fd.get('amount')), paidOn: fd.get('paidOn'), mode: fd.get('mode'), bsr, challanNo: no, interest: num(fd.get('interest')) }, up[0] ? { file: up[0] } : {})
  await save('tds', c); closeDrawer()
}

/** SUBMIT.tdsReturn */
export async function submitTdsReturn(q, fd) {
  const ack = (fd.get('ack') || '').trim(); if (!/^\d{15}$/.test(ack)) { toast('Token / acknowledgement number should be 15 digits.'); return }
  q = +q; const fyv = tdsv().fy; const old = tdsDocs('return').find(r => r.fy === fyv && r.q === q) || { kind: 'return', ws: tdsWs(), fy: fyv, q, f16a: {} }; const up = await uploadFiles(fd.getAll('files').filter(x => x.size), 1)
  await save('tds', Object.assign({}, old, { filedOn: fd.get('filedOn'), rtype: fd.get('rtype'), ack, filedBy: fd.get('filedBy') }, up[0] ? { file: up[0] } : {})); closeDrawer()
}

/** SUBMIT.tds16 — mark Form 16A issued for one owner (drawer stays open). */
export async function submitTds16(q, ownerId, fd) {
  q = +q; const fyv = tdsv().fy; const old = tdsDocs('return').find(r => r.fy === fyv && r.q === q) || { kind: 'return', ws: tdsWs(), fy: fyv, q, f16a: {} }; const up = await uploadFiles(fd.getAll('files').filter(x => x.size), 1)
  old.f16a = Object.assign({}, old.f16a, { [ownerId]: { issuedOn: fd.get('issuedOn'), file: up[0] || null } }); await save('tds', old)
}

/** SUBMIT.tdsCert — owner PAN status and lower / nil deduction certificate. */
export async function submitTdsCert(id, fd) {
  const O = owner(id); const pan = (fd.get('pan') || '').trim().toUpperCase(); if (pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) { toast('PAN should look like ABCDE1234F'); return }
  const type = fd.get('type'); const up = await uploadFiles(fd.getAll('files').filter(x => x.size), 1)
  if (type && !(fd.get('from') && fd.get('to') && fd.get('rate') !== '')) { toast('Enter the rate and validity dates of the certificate.'); return }
  Object.assign(O, { pan, panStatus: fd.get('panStatus'), panCheckedOn: fd.get('panCheckedOn') }); O.tdsCert = type ? Object.assign({}, O.tdsCert, { type, certNo: fd.get('certNo'), rate: num(fd.get('rate')), limit: num(fd.get('limit')), from: fd.get('from'), to: fd.get('to') }, up[0] ? { file: up[0] } : {}) : null
  clearSchedCache(); await save('owners', O); closeDrawer()
}
