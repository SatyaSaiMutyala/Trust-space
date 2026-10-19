/*
 * Branded emails: one layout (teal header with the TruSpace mark, white card, grey footer) and one builder per
 * message. Each returns { subject, text, html } — the text version is what plain-mail clients and tests read.
 * Inline styles only, table layout, no images: renders the same in Outlook, Gmail and phone mail apps.
 */
import { env } from '../config/env.js'

const C = { teal: '#1d7a3e', tealDark: '#15612f', ink: '#16211a', muted: '#5a6a60', line: '#d5ddd4', bg: '#f3f5f2', sun: '#d9a514', card: '#ffffff', tint: '#e6f4f1' }
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
const first = n => String(n || '').trim().split(/\s+/)[0] || 'there'
const app = () => env.appName || 'TruSpace'

/** Paragraphs from an array of strings (each becomes a <p>). */
const paras = lines => lines.filter(Boolean).map(l => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${C.ink}">${l}</p>`).join('')
/** A big, copyable six-digit code. */
const codeBox = code => `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:22px auto"><tr><td style="background:${C.tint};border:1px solid #bfe3dc;border-radius:12px;padding:18px 32px;font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:12px;color:${C.tealDark};text-align:center">${esc(code)}</td></tr></table>`
/** A teal button. */
const button = (label, url) => `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:22px auto"><tr><td style="background:${C.teal};border-radius:10px;mso-padding-alt:14px 28px"><a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">${esc(label)}</a></td></tr></table>`
/** Label / value rows, for what the person submitted. */
const facts = rows => `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:6px 0 18px;border:1px solid ${C.line};border-radius:10px;border-collapse:separate;overflow:hidden">${rows.filter(r => r[1]).map(([l, v], i) => `<tr><td style="padding:10px 14px;font-size:13px;color:${C.muted};width:38%;background:${i % 2 ? '#fafbfa' : '#ffffff'};border-top:${i ? '1px solid ' + C.line : '0'}">${esc(l)}</td><td style="padding:10px 14px;font-size:14px;color:${C.ink};font-weight:600;background:${i % 2 ? '#fafbfa' : '#ffffff'};border-top:${i ? '1px solid ' + C.line : '0'}">${esc(v)}</td></tr>`).join('')}</table>`
/** A soft note box (amber accent) for things worth knowing. */
const note = text => `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:4px 0 18px"><tr><td style="background:#fbf3dd;border-left:4px solid ${C.sun};border-radius:8px;padding:12px 14px;font-size:13.5px;line-height:1.5;color:#6e4e0c">${text}</td></tr></table>`

/** The shell around every mail: header, white card with the title and body, footer. preheader = the preview line in inboxes. */
function layout({ title, preheader, body, cta }) {
  const name = app()
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-font-smoothing:antialiased">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${esc(preheader || title)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:${C.bg};font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px">
  <tr><td style="padding:0 0 16px">
    <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
      <td style="width:40px;height:40px;background:${C.teal};border-radius:10px;text-align:center;vertical-align:middle;font-size:22px;font-weight:800;color:#ffffff;font-family:Georgia,'Times New Roman',serif">T</td>
      <td style="padding-left:12px;font-size:19px;font-weight:700;color:${C.ink};letter-spacing:-.01em">${esc(name)}<div style="font-size:12px;font-weight:400;color:${C.muted};margin-top:1px">Premises, leases &amp; rent</div></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:${C.card};border:1px solid ${C.line};border-radius:14px;padding:30px 30px 18px">
    <h1 style="margin:0 0 18px;font-size:22px;line-height:1.3;font-weight:700;color:${C.ink};letter-spacing:-.01em">${esc(title)}</h1>
    ${body}
    ${cta || ''}
  </td></tr>
  <tr><td style="padding:18px 8px 0;font-size:12px;line-height:1.6;color:${C.muted};text-align:center">
    This email was sent by ${esc(name)} on behalf of the facilities team.<br>If you did not expect it, you can ignore it — nothing changes without your action.<br>
    <span style="color:#8a978e">© ${new Date().getFullYear()} ${esc(name)}</span>
  </td></tr>
</table></td></tr></table></body></html>`
}

export const templates = {
  signupCode({ code, minutes }) {
    const title = 'Confirm your email'
    return {
      subject: `${code} is your ${app()} code`,
      text: `Your ${app()} sign-up code is\n\n${code}\n\nEnter it in the app to confirm your email. It works for ${minutes} minutes.\n\nIf you did not ask for it, ignore this email.`,
      html: layout({ title, preheader: `Your code is ${code}. It works for ${minutes} minutes.`, body: paras([`Enter this code in the app to confirm your email address and continue creating your owner account.`]) + codeBox(code) + paras([`<span style="color:${C.muted};font-size:13.5px">The code works for <b>${minutes} minutes</b> and can be used once. If you did not ask for it, ignore this email — nothing changes.</span>`]) }),
    }
  },

  signupReceived({ name, email, propertyCode, propertyName, propertyTown, pan, bank }) {
    const title = `Thank you, ${esc(first(name))} — your account is being set up`
    const prop = propertyCode || [propertyName, propertyTown].filter(Boolean).join(', ')
    return {
      subject: `Thank you — your ${app()} account is being set up`,
      text: `Hello ${first(name)},\n\nThank you for signing up. The facilities team now checks your PAN and bank details and links your property${prop ? ` (${prop})` : ''} to your account. You will get an email when it is ready, usually within one working day.\n\nUntil then you can sign in with ${email} to see the status.`,
      html: layout({ title: `Thank you, ${first(name)}`, preheader: 'Your account is being set up — usually within one working day.', body:
        paras([`Thank you for signing up to ${esc(app())}. Your details are with the facilities team, who now check them and link your property to your account.`])
        + facts([['Sign-in email', email], ['Property', prop], ['PAN', pan], ['Bank', bank]])
        + `<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 18px"><tr>
            ${[['1', 'Submitted', true], ['2', 'PAN check', false], ['3', 'Bank check', false], ['4', 'Linked', false]].map(([n, l, done]) => `<td align="center" style="padding:6px 2px;border-top:4px solid ${done ? C.teal : C.line};font-size:12px;color:${done ? C.ink : C.muted};font-weight:${done ? 700 : 400}">${l}</td>`).join('')}
          </tr></table>`
        + paras([`You will get an email when it is ready, <b>usually within one working day</b>. Until then you can sign in with <b>${esc(email)}</b> to see the status. Nothing else is needed from you.`]) }),
    }
  },

  signupApproved({ name, email, loginUrl }) {
    return {
      subject: `Your ${app()} account is ready`,
      text: `Hello ${first(name)},\n\nYour ${app()} account is approved. Sign in with ${email} and the password you chose to see your property, invoices and messages.\n\n${loginUrl}`,
      html: layout({ title: `Welcome, ${first(name)} — you're in`, preheader: 'Your account is approved. Sign in to see your property, invoices and messages.', body:
        paras([`The facilities team has verified your details and linked your property. Sign in with <b>${esc(email)}</b> and the password you chose.`])
        + paras([`In the app you can raise your monthly invoice, follow each payment to your bank, see TDS credited against your PAN, report repairs and message the facilities team.`]),
        cta: button(`Open ${app()}`, loginUrl) }),
    }
  },

  signupDeclined({ name, contact }) {
    return {
      subject: `About your ${app()} sign-up`,
      text: `Hello ${first(name)},\n\nWe could not set up your ${app()} account from the details given. Please contact the facilities team to sort it out${contact ? `: ${contact}` : '.'}`,
      html: layout({ title: `About your ${app()} sign-up`, preheader: 'We could not set up your account from the details given.', body:
        paras([`Hello ${esc(first(name))},`, `We could not set up your ${esc(app())} account from the details given. This usually means the property could not be matched to a lease, or the PAN or bank details need a second look.`])
        + note(`Please contact the facilities team${contact ? ` at <b>${esc(contact)}</b>` : ''} and they will sort it out with you. You can sign up again once the details are confirmed.`) }),
    }
  },

  passwordReset({ name, link, minutes }) {
    return {
      subject: `Reset your ${app()} password`,
      text: `Hello ${first(name)},\n\nSomeone asked to reset the password of your ${app()} account. Open this link to choose a new one:\n\n${link}\n\nIt works for ${minutes} minutes. If it was not you, ignore this email — nothing changes.`,
      html: layout({ title: 'Reset your password', preheader: `Choose a new password — the link works for ${minutes} minutes.`, body:
        paras([`Hello ${esc(first(name))},`, `Someone asked to reset the password of your ${esc(app())} account. Choose a new one with the button below.`]),
        cta: button('Choose a new password', link) + paras([`<span style="color:${C.muted};font-size:13.5px">The link works for <b>${minutes} minutes</b>. If it was not you, ignore this email — your password stays as it is.</span>`, `<span style="color:${C.muted};font-size:12.5px;word-break:break-all">Or copy this address into your browser: ${esc(link)}</span>`]) }),
    }
  },

  accountClosed({ name }) {
    return {
      subject: `Your ${app()} account is closed`,
      text: `Hello ${first(name)},\n\nYour ${app()} account was closed at your request. Rent, TDS and deposit records stay with the facilities team as the law requires. Contact them if you need a copy.`,
      html: layout({ title: 'Your account is closed', preheader: 'Closed at your request. Your rent and tax records stay with the facilities team.', body:
        paras([`Hello ${esc(first(name))},`, `Your ${esc(app())} account was closed at your request. Sign-in on every device has stopped and your contact details were removed from the account.`])
        + note(`Rent, TDS and deposit records stay with the facilities team, as tax law requires. Contact them if you need a copy or want access again.`) }),
    }
  },
}
