/*
 * Sign-in page: brand panel + form card with three steps — sign in, forgot password, set a new password.
 * Outcomes are announced in the snackbar with the API's `message`; the inline notice only shows checks made before calling the API.
 */
import { useState } from 'react'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import { signIn, forgotPassword, resetPassword, passwordProblem, DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../services/auth'
import { toast } from '../../store/store'

const svg = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }
const Icon = {
  user: <svg width="18" height="18" viewBox="0 0 24 24" style={svg}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>,
  lock: <svg width="18" height="18" viewBox="0 0 24 24" style={svg}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>,
  eye: <svg width="18" height="18" viewBox="0 0 24 24" style={svg}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>,
  eyeOff: <svg width="18" height="18" viewBox="0 0 24 24" style={svg}><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>,
  back: <svg width="16" height="16" viewBox="0 0 24 24" style={svg}><path d="M15 18l-6-6 6-6" /></svg>,
  rent: <svg width="22" height="22" viewBox="0 0 24 24" style={svg}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 10h18M7 15h4" /></svg>,
  check: <svg width="22" height="22" viewBox="0 0 24 24" style={svg}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v3h6V3M8.5 13l2.5 2.5 4.5-5" /></svg>,
  people: <svg width="22" height="22" viewBox="0 0 24 24" style={svg}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" /></svg>,
  ok: <svg width="14" height="14" viewBox="0 0 24 24" style={{ ...svg, strokeWidth: 2.6 }}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
}

function Mark({ size = 44 }) {
  return (
    <Box aria-hidden="true" sx={{ width: size, height: size, borderRadius: `${size * 0.24}px`, bgcolor: 'var(--accent)', display: 'grid', placeItems: 'center', color: 'var(--accent-ink)', font: `700 ${size * 0.52}px var(--f-display)`, position: 'relative', flex: 'none', boxShadow: '0 6px 18px rgb(0 0 0 / .18)', '&::after': { content: '""', position: 'absolute', right: -size * 0.08, bottom: -size * 0.08, width: size * 0.32, height: size * 0.32, borderRadius: `${size * 0.09}px`, bgcolor: 'var(--sun)' } }}>T</Box>
  )
}

/** Left side: brand, promise and what the portal does. */
function BrandPanel() {
  const feats = [
    [Icon.rent, 'Rent, invoices & ledgers', 'Escalations, GST, TDS and every payment to owners in one register.'],
    [Icon.check, 'Joint inspections with proof', 'Take-over and handover checklists signed by both sides, with photos and video.'],
    [Icon.people, 'One portal for everyone', 'TrustLab teams, property owners and franchise partners — each sees only their own premises.'],
  ]
  return (
    <Box sx={{
      position: 'relative', overflow: 'hidden', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 5,
      p: { xs: 3, md: 6 }, background: 'linear-gradient(150deg, #1d7a3e 0%, #145a2d 55%, #0d3d1f 100%)',
      '&::before': { content: '""', position: 'absolute', inset: 0, opacity: .14, backgroundImage: 'linear-gradient(rgb(255 255 255 / .5) 1px, transparent 1px), linear-gradient(90deg, rgb(255 255 255 / .5) 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(ellipse at 30% 20%, #000 10%, transparent 70%)' },
      '&::after': { content: '""', position: 'absolute', width: 420, height: 420, right: -140, bottom: -160, borderRadius: '50%', background: 'radial-gradient(circle, rgb(217 165 20 / .35), transparent 65%)' },
      '@media (max-width:899px)': { display: 'none' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.75, position: 'relative', zIndex: 1 }}>
        <Mark />
        <div>
          <Box sx={{ font: '700 22px var(--f-display)', lineHeight: 1 }}>TruSpace</Box>
          <Box sx={{ fontSize: 13, opacity: .8, mt: .5 }}>TrustLab Facilities &amp; Leases</Box>
        </div>
      </Box>

      <Box sx={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
        <Box component="h1" sx={{ color: '#fff', fontSize: { md: '2.3rem', lg: '2.7rem' }, lineHeight: 1.1, mb: 2 }}>Every premises, lease and payment — in one place.</Box>
        <Box sx={{ fontSize: 16, opacity: .85, lineHeight: 1.6, mb: 4 }}>The facilities portal for TrustLab Diagnostics labs, collection centres and franchise partners.</Box>
        <Box sx={{ display: 'grid', gap: 2.25 }}>
          {feats.map(([ic, t, d]) => (
            <Box key={t} sx={{ display: 'flex', gap: 1.75, alignItems: 'flex-start' }}>
              <Box sx={{ width: 44, height: 44, flex: 'none', borderRadius: '12px', display: 'grid', placeItems: 'center', bgcolor: 'rgb(255 255 255 / .12)', border: '1px solid rgb(255 255 255 / .18)', backdropFilter: 'blur(4px)' }}>{ic}</Box>
              <div><Box sx={{ fontWeight: 600, fontSize: 15 }}>{t}</Box><Box sx={{ fontSize: 13.5, opacity: .78, lineHeight: 1.5 }}>{d}</Box></div>
            </Box>
          ))}
        </Box>
      </Box>

      {/* A small "product preview" card for depth */}
      <Box sx={{ position: 'relative', zIndex: 1, alignSelf: 'flex-start', bgcolor: 'rgb(255 255 255 / .1)', border: '1px solid rgb(255 255 255 / .18)', borderRadius: '14px', p: 2, backdropFilter: 'blur(6px)', display: 'flex', gap: 3 }}>
        {[['₹7.8 L', 'monthly rent roll'], ['7', 'premises'], ['0', 'missed escalations']].map(([v, l]) => (
          <div key={l}><Box sx={{ font: '700 22px var(--f-display)' }}>{v}</Box><Box sx={{ fontSize: 12, opacity: .75 }}>{l}</Box></div>
        ))}
      </Box>
    </Box>
  )
}

const YEAR = new Date().getFullYear()
const fieldSx = { '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: 'var(--surface)', minHeight: 50 }, '& .MuiInputAdornment-root': { color: 'var(--muted)' } }

function Notice({ kind, children }) {
  if (!children) return null
  const c = kind === 'ok' ? 'var(--ok)' : 'var(--bad)'
  return <Box role={kind === 'ok' ? 'status' : 'alert'} sx={{ border: `1px solid color-mix(in srgb,${c} 40%,var(--line))`, bgcolor: `color-mix(in srgb,${c} 8%,var(--surface))`, color: 'var(--ink)', borderLeft: `4px solid ${c}`, borderRadius: '10px', px: 1.75, py: 1.25, fontSize: 13.5, lineHeight: 1.5 }}>{children}</Box>
}

function PasswordRules({ value }) {
  const rules = [['At least 8 characters', value.length >= 8], ['A letter', /[A-Za-z]/.test(value)], ['A number', /\d/.test(value)]]
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', fontSize: 12.5 }}>
      {rules.map(([t, okay]) => <Box key={t} sx={{ display: 'flex', alignItems: 'center', gap: .5, color: okay ? 'var(--ok)' : 'var(--muted)' }}>{okay ? Icon.ok : <span style={{ width: 14, textAlign: 'center' }}>•</span>}{t}</Box>)}
    </Box>
  )
}

export default function LoginPage() {
  const resetFromUrl = new URLSearchParams(location.search).get('reset')
  const [mode, setMode] = useState(resetFromUrl ? 'reset' : 'signin') // signin | forgot | reset
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { kind: 'ok' | 'bad', text }
  const [resetToken, setResetToken] = useState(resetFromUrl || '')

  const go = m => { setMode(m); setMsg(null); setPassword(''); setPassword2(''); setShow(false) }
  const run = async fn => { setBusy(true); setMsg(null); try { await fn() } catch (e) { toast(e.message, 'error') } finally { setBusy(false) } }

  const onSignIn = e => { e.preventDefault(); run(async () => { const r = await signIn({ login, password, remember }); toast(r.message, 'success') }) }
  const onForgot = e => { e.preventDefault(); run(async () => { const r = await forgotPassword(login); toast(r.message, 'success'); if (r.data?.devResetToken) setResetToken(r.data.devResetToken) }) }
  const onReset = e => {
    e.preventDefault()
    run(async () => {
      if (password !== password2) { setMsg({ kind: 'bad', text: 'The two passwords do not match.' }); return }
      const p = passwordProblem(password); if (p) { setMsg({ kind: 'bad', text: p }); return }
      const r = await resetPassword(resetToken, password)
      if (resetFromUrl) history.replaceState(null, '', location.pathname)
      setMode('signin'); setPassword(''); setPassword2(''); toast(r.message, 'success')
    })
  }

  const title = { signin: 'Sign in', forgot: 'Reset your password', reset: 'Choose a new password' }[mode]
  const sub = {
    signin: 'Welcome back. Use your email or mobile number to continue.',
    forgot: 'Enter the email or mobile number of your account and we will send you a reset link.',
    reset: 'Use at least 8 characters with a letter and a number.',
  }[mode]
  const passwordAdornment = (
    <InputAdornment position="end">
      <IconButton onClick={() => setShow(s => !s)} edge="end" aria-label={show ? 'Hide password' : 'Show password'} sx={{ color: 'var(--muted)' }}>{show ? Icon.eyeOff : Icon.eye}</IconButton>
    </InputAdornment>
  )
  const submit = label => (
    <Button type="submit" variant="contained" disabled={busy} fullWidth
      sx={{ minHeight: 50, borderRadius: '10px', fontSize: 15, fontWeight: 600, boxShadow: '0 6px 16px color-mix(in srgb,var(--accent) 30%,transparent)', '&.Mui-disabled': { bgcolor: 'var(--accent)', color: 'var(--accent-ink)', opacity: .7 } }}>
      {busy ? <CircularProgress size={22} sx={{ color: 'inherit' }} /> : label}
    </Button>
  )

  return (
    <Box sx={{ minHeight: '100dvh', display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.05fr 1fr' }, bgcolor: 'var(--bg)' }}>
      <BrandPanel />

      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100dvh', px: { xs: 2, sm: 4 }, py: { xs: 3, sm: 5 } }}>
        {/* Phone/tablet header (the brand panel is hidden below 900px) */}
        <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4 }}>
          <Mark size={38} />
          <div><Box sx={{ font: '700 19px var(--f-display)', lineHeight: 1 }}>TruSpace</Box><Box className="small muted">TrustLab Facilities &amp; Leases</Box></div>
        </Box>

        <Box sx={{ flex: 1, display: 'grid', placeItems: 'center' }}>
          <Box sx={{ width: '100%', maxWidth: 420 }}>
            <Box sx={{ bgcolor: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '16px', boxShadow: 'var(--shadow)', p: { xs: 2.5, sm: 4 } }}>
              {mode !== 'signin' ? (
                <Box component="button" type="button" onClick={() => go('signin')} sx={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: .5, color: 'var(--muted)', fontSize: 13, mb: 2, '&:hover': { color: 'var(--accent)' } }}>{Icon.back} Back to sign in</Box>
              ) : null}
              <Box component="h1" sx={{ fontSize: { xs: '1.6rem', sm: '1.85rem' }, mb: .75 }}>{title}</Box>
              <Box sx={{ color: 'var(--muted)', fontSize: 14, lineHeight: 1.5, mb: 3 }}>{sub}</Box>

              <Box sx={{ display: 'grid', gap: 2 }}>
                <Notice kind={msg?.kind}>{msg?.text}</Notice>

                {mode === 'signin' ? (
                  <Box component="form" onSubmit={onSignIn} noValidate sx={{ display: 'grid', gap: 2 }}>
                    <TextField label="Email or mobile number" value={login} onChange={e => setLogin(e.target.value)} autoComplete="username" autoFocus sx={fieldSx}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">{Icon.user}</InputAdornment> }, htmlInput: { inputMode: 'email' } }} />
                    <TextField label="Password" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" sx={fieldSx}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">{Icon.lock}</InputAdornment>, endAdornment: passwordAdornment } }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mt: -.5 }}>
                      <FormControlLabel control={<Checkbox checked={remember} onChange={e => setRemember(e.target.checked)} />} label={<>Remember me<Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}> for 30 days</Box></>} sx={{ m: 0, '& .MuiFormControlLabel-label': { fontSize: 13.5 } }} />
                      <Box component="button" type="button" onClick={() => go('forgot')} sx={{ all: 'unset', cursor: 'pointer', color: 'var(--accent)', fontSize: 13.5, fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>Forgot password?</Box>
                    </Box>
                    {submit('Sign in')}
                  </Box>
                ) : null}

                {mode === 'forgot' ? (
                  <Box component="form" onSubmit={onForgot} noValidate sx={{ display: 'grid', gap: 2 }}>
                    <TextField label="Email or mobile number" value={login} onChange={e => setLogin(e.target.value)} autoComplete="username" autoFocus sx={fieldSx}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">{Icon.user}</InputAdornment> } }} />
                    {submit('Send reset link')}
                    {resetToken ? (
                      <Box sx={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center' }}>
                        Development: email is not connected yet —{' '}
                        <Box component="button" type="button" onClick={() => { setMode('reset'); setMsg(null) }} sx={{ all: 'unset', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }}>open the reset link</Box>
                      </Box>
                    ) : null}
                  </Box>
                ) : null}

                {mode === 'reset' ? (
                  <Box component="form" onSubmit={onReset} noValidate sx={{ display: 'grid', gap: 2 }}>
                    <TextField label="New password" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" autoFocus sx={fieldSx}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">{Icon.lock}</InputAdornment>, endAdornment: passwordAdornment } }} />
                    <PasswordRules value={password} />
                    <TextField label="Confirm new password" type={show ? 'text' : 'password'} value={password2} onChange={e => setPassword2(e.target.value)} autoComplete="new-password" sx={fieldSx}
                      error={!!password2 && password2 !== password} helperText={password2 && password2 !== password ? 'Passwords do not match' : ' '}
                      slotProps={{ input: { startAdornment: <InputAdornment position="start">{Icon.lock}</InputAdornment> } }} />
                    {submit('Change password')}
                  </Box>
                ) : null}
              </Box>
            </Box>

            {mode === 'signin' && import.meta.env.DEV ? <DemoAccounts onPick={(l) => { setLogin(l); setPassword(DEMO_PASSWORD); setMsg(null) }} /> : null}

            <Box sx={{ textAlign: 'center', fontSize: 12.5, color: 'var(--muted)', mt: 3, lineHeight: 1.6 }}>
              Need access? Contact the Facilities desk<br />040 2776 5656 · admin@mytrustlab.com
            </Box>
          </Box>
        </Box>

        <Box sx={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', mt: 3 }}>© {YEAR} TrustLab Diagnostics Pvt. Ltd.</Box>
      </Box>
    </Box>
  )
}

/** Development helper: one-click sample accounts from the backend seed (not shown in production builds). */
function DemoAccounts({ onPick }) {
  return (
    <Box sx={{ mt: 2, border: '1px dashed var(--line)', borderRadius: '12px', p: 1.75 }}>
      <Box sx={{ fontSize: 12, color: 'var(--muted)', mb: 1 }}>Sample accounts — password <b className="mono">{DEMO_PASSWORD}</b></Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: .75 }}>
        {DEMO_ACCOUNTS.map(a => (
          <Box component="button" type="button" key={a.email} onClick={() => onPick(a.email)} title={a.email}
            sx={{ all: 'unset', cursor: 'pointer', fontSize: 12.5, px: 1.25, py: .5, borderRadius: 999, border: '1px solid var(--line)', bgcolor: 'var(--surface)', '&:hover': { borderColor: 'var(--accent)', color: 'var(--accent)' }, '@media (pointer:coarse)': { py: 1 } }}>
            {a.label} · {a.name}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
