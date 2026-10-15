/* Downloadable invoice document — ported verbatim from reference/TruSpace.html (invDoc / invoiceHTML). */
import { S, prop, owner, partner, tenantOf } from '../store/store'
import { esc, fmtD, perLabel, inr } from './utils'
import { maskAcct } from './lease'

export function invDocHTML(i, P, O, L) {
  return `<div class="invdoc"><div class="split"><div><div style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#666">${i.gst ? 'Tax invoice' : 'Invoice'}${i.source === 'Uploaded' ? ' · uploaded copy on file' : ''}</div><h2>${esc(O?.name || '')}</h2><div>${esc(O?.address || '')}</div><div>PAN ${esc(O?.pan || '—')}${O?.gstin ? ' · GSTIN ' + esc(O.gstin) : ''}</div></div>
    <div style="text-align:right"><div><b>No.</b> <span class="mono">${esc(i.number)}</span></div><div><b>Date</b> ${fmtD(i.date)}</div><div><b>Due</b> ${fmtD(i.dueDate)}</div><div><b>Period</b> ${perLabel(i.period)}</div></div></div>
    <div><b>Bill to</b><br>${P && P.managedBy === 'franchise' ? `${esc(tenantOf(P))}<br>${esc(partner(P.partnerId)?.city || '')} · TrustLab franchise partner` : 'TrustLab Diagnostics Private Limited<br>#31, Street No. 5, Prakash Nagar, Begumpet, Hyderabad – 500016<br>CIN U85100TG2020PTC143059'}</div>
    <div><b>Premises</b> ${esc(P?.name || '')} (${esc(P?.code || '')}), ${esc(P?.address || '')}, ${esc(P?.city || '')}${L ? ` · Lease ${esc(L.ref)}` : ''}</div>
    <div style="overflow-x:auto"><table><thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead><tbody>
      <tr><td>${esc(i.desc || `${i.type} for ${perLabel(i.period)}`)}${i.type === 'Rent' ? ' · SAC 997212' : ''}</td><td class="num">${inr(i.base)}</td></tr>
      ${i.gst ? `<tr><td>${P?.state === 'Telangana' && (O?.gstin || '').startsWith('36') ? 'CGST 9% + SGST 9%' : 'IGST 18%'}</td><td class="num">${inr(i.gst)}</td></tr>` : ''}
      <tr class="tot"><td>Invoice total</td><td class="num">${inr(i.total)}</td></tr>
      ${i.tds ? `<tr><td>Less: TDS 10% to be deducted by TrustLab</td><td class="num">−${inr(i.tds)}</td></tr>` : ''}
      <tr class="tot"><td>Net payable</td><td class="num">${inr(i.net)}</td></tr></tbody></table></div>
    ${i.rcm ? `<div style="font-size:12px;color:#555">GST on this supply is payable by the recipient under reverse charge (owner not registered under GST).</div>` : ''}
    <div style="font-size:12px;color:#555">Payment to: ${esc(O?.acctHolder || O?.name || '')} · ${esc([O?.bankName, O?.bankBranch].filter(Boolean).join(', ') || O?.bank || 'bank as per lease')}${O?.acctNo ? ' · A/c ' + esc(maskAcct(O.acctNo)) + ' · IFSC ' + esc(O.ifsc || '') : ''}</div></div>`
}
export function invoiceHTML(i) {
  const P = prop(i.propertyId), O = owner(i.ownerId), L = S.leases.find(l => l.id === i.leaseId)
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(i.number)}</title><style>body{font-family:Georgia,serif;max-width:760px;margin:30px auto;color:#1b1b1b}table{width:100%;border-collapse:collapse}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:left}.num{text-align:right}.split{display:flex;justify-content:space-between;gap:20px}.invdoc{display:grid;gap:16px}.mono{font-family:monospace}</style></head><body>${invDocHTML(i, P, O, L)}<p style="margin-top:40px">Authorised signatory</p></body></html>`
}
