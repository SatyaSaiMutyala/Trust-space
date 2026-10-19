/*
 * Outgoing mail over SMTP (nodemailer): sign-up codes, password-reset links, account approval.
 * Settings come from .env (MAIL_HOST, MAIL_PORT, MAIL_USERNAME, MAIL_PASSWORD, MAIL_ENCRYPTION, MAIL_FROM_ADDRESS,
 * MAIL_FROM_NAME). With no MAIL_HOST — development and tests — nothing is sent: the mail is logged and kept in
 * `outbox` so callers and tests can read it. A delivery failure never breaks the request that triggered it; it is
 * logged and reported back as { sent: false }.
 */
import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transport = null
export const outbox = [] // last mails in log mode (newest last, capped)
export const mailEnabled = () => !!env.mail.host

function getTransport() {
  if (transport) return transport
  const enc = (env.mail.encryption || '').toUpperCase()
  transport = nodemailer.createTransport({
    host: env.mail.host, port: env.mail.port,
    secure: enc === 'SSL' || enc === 'TLS' || env.mail.port === 465, // implicit TLS
    requireTLS: enc === 'STARTTLS', // upgrade the connection before sending
    auth: env.mail.username ? { user: env.mail.username, pass: env.mail.password } : undefined,
  })
  return transport
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
/** Plain-text body → a simple HTML version with the same lines (paragraphs and a highlighted code / link). */
function html(text) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.5;color:#16211a;max-width:560px">${String(text).split(/\n{2,}/).map(p => `<p style="margin:0 0 14px">${esc(p).replace(/\n/g, '<br>').replace(/\b(\d{6})\b/, '<b style="font-size:22px;letter-spacing:.2em">$1</b>').replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>')}</p>`).join('')}</div>`
}

/** Send one mail. `html` is optional (templates provide a branded one; otherwise the text is wrapped). Returns { sent, logged?, error? }. */
export async function sendMail({ to, subject, text, html: ready }) {
  const from = env.mail.fromName ? `"${env.mail.fromName}" <${env.mail.from}>` : env.mail.from
  if (!mailEnabled()) {
    outbox.push({ to, subject, text, at: new Date().toISOString() }); if (outbox.length > 50) outbox.shift()
    if (env.nodeEnv !== 'test') console.log(`[mail → ${to}] ${subject}\n${text}\n`)
    return { sent: false, logged: true }
  }
  try {
    await getTransport().sendMail({ from, to, subject, text, html: ready || html(text) })
    return { sent: true }
  } catch (e) {
    console.error(`Mail to ${to} failed: ${e.message}`)
    return { sent: false, error: e.message }
  }
}
