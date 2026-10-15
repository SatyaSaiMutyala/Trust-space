/* Dev-only URL hook for side-by-side comparison with reference/TruSpace-nav.html (see tools/shot.sh). */
import { UI, rescope, emit, openDrawer } from './store/store'

export function applyDevQuery() {
  const q = new URLSearchParams(location.search)
  if (q.get('route')) UI.route = q.get('route')
  if (q.get('sel')) UI.sel = q.get('sel')
  if (q.get('tab')) UI.tab = q.get('tab')
  if (q.get('mode')) UI.siteMode = q.get('mode')
  rescope(); emit()
  if (q.get('d')) openDrawer(JSON.parse(q.get('d')))
}

/** ?probe=1 — after render, list elements that stick out past the viewport without a scrolling ancestor (layout overflow check). */
export function runOverflowProbe() {
  if (!new URLSearchParams(location.search).get('probe')) return
  setTimeout(() => {
    const W = document.documentElement.clientWidth
    const scrolls = el => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden') return true } return false }
    const bad = []
    document.querySelectorAll('body *').forEach(el => {
      const r = el.getBoundingClientRect()
      if (r.width && r.right > W + 1 && !scrolls(el)) bad.push(el)
    })
    const top = bad.filter(el => !bad.includes(el.parentElement)).slice(0, 8)
    const pre = document.createElement('pre'); pre.id = 'probe'
    pre.textContent = `PROBE vw=${W} docW=${document.documentElement.scrollWidth} offenders=${top.length} ` + top.map(el => `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)}[${Math.round(el.getBoundingClientRect().right)}]`).join(' | ')
    document.body.appendChild(pre)
  }, 2500)
}
