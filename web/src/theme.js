import { createTheme } from '@mui/material/styles'

const display = '"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif'
const body = '"IBM Plex Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif'

const light = {
  primary: { main: '#1d7a3e', contrastText: '#ffffff' },
  secondary: { main: '#d9a514' },
  success: { main: '#1d7a3e' },
  warning: { main: '#a86b0c' },
  error: { main: '#c03d12' },
  info: { main: '#2a5f9e' },
  background: { default: '#f3f5f2', paper: '#ffffff' },
  text: { primary: '#16211a', secondary: '#5a6a60' },
  divider: '#d5ddd4',
}
const dark = {
  primary: { main: '#4cb672', contrastText: '#04110a' },
  secondary: { main: '#f0c540' },
  success: { main: '#4cb672' },
  warning: { main: '#e2a74a' },
  error: { main: '#f17d50' },
  info: { main: '#71a8ea' },
  background: { default: '#0e1411', paper: '#151d18' },
  text: { primary: '#e4ebe6', secondary: '#97a69c' },
  divider: '#28342d',
}

const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'media' },
  colorSchemes: { light: { palette: light }, dark: { palette: dark } },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: body,
    fontSize: 14,
    body1: { fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    h1: { fontFamily: display, fontWeight: 700, fontSize: '1.65rem', lineHeight: 1.15, letterSpacing: '-.01em' },
    h2: { fontFamily: display, fontWeight: 700, fontSize: '1.15rem', letterSpacing: '-.01em' },
    h3: { fontFamily: display, fontWeight: 700, fontSize: '.98rem', letterSpacing: '-.01em' },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, variant: 'outlined', color: 'inherit' },
      styleOverrides: {
        root: { whiteSpace: 'nowrap', borderRadius: 6, padding: '6px 12px', borderColor: 'var(--line)', backgroundColor: 'var(--surface)', '@media (pointer:coarse)': { minHeight: 44 } },
        sizeSmall: { padding: '3px 9px', fontSize: 12.5, '@media (pointer:coarse)': { minHeight: 38 } },
        outlined: { '&:hover': { borderColor: 'var(--muted)', backgroundColor: 'var(--surface)' } },
        contained: { backgroundColor: 'var(--accent)', color: 'var(--accent-ink)', '&:hover': { backgroundColor: 'var(--accent)', filter: 'brightness(1.07)' } },
        text: { backgroundColor: 'transparent', borderColor: 'transparent' },
      },
    },
    MuiCssBaseline: { styleOverrides: { body: { font: '14px/1.5 var(--f-body)', backgroundColor: 'var(--bg)', color: 'var(--ink)' } } },
    MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: 'var(--surface)' }, notchedOutline: { borderColor: 'var(--line)' } } },
    MuiInputBase: { styleOverrides: { root: { '@media (max-width:760px)': { fontSize: 16 } } } },
    MuiSelect: { defaultProps: { size: 'small' } },
    MuiFormHelperText: { styleOverrides: { root: { marginLeft: 0, fontSize: 11.5 } } },
    MuiCheckbox: { defaultProps: { size: 'small' } },
    MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiTableCell: {
      styleOverrides: {
        root: { padding: '10px 12px', borderBottom: '1px solid var(--line)', verticalAlign: 'top', fontSize: 13.5, '&.num': { textAlign: 'right', fontFamily: 'var(--f-mono)', whiteSpace: 'nowrap' }, '&.mono': { fontFamily: 'var(--f-mono)' }, '&.small': { fontSize: 12.5 }, '&.muted': { color: 'var(--muted)' }, '&.empty': { padding: '30px 16px', textAlign: 'center', color: 'var(--muted)' } },
        footer: { fontSize: 13.5, color: 'var(--ink)' },
        head: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', padding: '9px 12px', backgroundColor: 'var(--surface)' },
      },
    },
    MuiTableRow: { styleOverrides: { root: { '&:last-child td': { borderBottom: 0 } } } },
    MuiTab: { styleOverrides: { root: { textTransform: 'none', fontWeight: 500, minHeight: 42 } } },
    MuiTabs: { styleOverrides: { root: { minHeight: 42, borderBottom: '1px solid var(--line)' } } },
    MuiDrawer: { styleOverrides: { paper: { backgroundColor: 'var(--bg)' } } },
    MuiSnackbarContent: { styleOverrides: { root: { backgroundColor: 'var(--ink)', color: 'var(--bg)', fontSize: 13.5 } } },
  },
})

export default theme
