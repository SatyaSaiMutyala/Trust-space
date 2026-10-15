import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from './theme.js'
import './styles/app.css'
import App from './App.jsx'
import { reduxStore } from './app/store'
import { restoreSession, devSignIn } from './services/auth'
import { applyDevQuery, runOverflowProbe } from './devHook'

async function start() {
  const q = new URLSearchParams(location.search)
  // Development: screenshot/test links (?route=…, ?role=…, ?d=…) sign in as the matching sample account first.
  if (import.meta.env.DEV && [...q.keys()].some(k => ['route', 'role', 'd', 'probe'].includes(k))) {
    await devSignIn(q.get('role'))
    applyDevQuery(); runOverflowProbe()
    return
  }
  await restoreSession()
}
if (import.meta.env.DEV) window.__store = reduxStore // dev tools / screenshot scripts only
start()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={reduxStore}>
      <ThemeProvider theme={theme}>
        <CssBaseline enableColorScheme />
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
