# Porting TruSpace to React + MUI

The source of truth is the single-file prototype `reference/TruSpace.html` (vanilla JS, ~2,600 lines).
The React app in `web/` must reproduce it **exactly**: every page, panel, column, chip, button, form field, label, hint,
placeholder, validation message, toast, empty state, conditional branch and role rule. Nothing is skipped or "simplified".
Seed (sample) data drives the UI until the Node API is integrated.

## Architecture (already built — use it, don't rebuild it)

| Area | Path | Notes |
| --- | --- | --- |
| Store | `src/store/store.js` | `ALL` (all records), `S` (records in the current workspace scope), `UI` (route, sel, tab, filt, conv, convOpen, roleView, schedMode, led, siteMode), `ME`, `APP` (live, drawer, toast, lightbox, sheet). `useStore()` re-renders on any change — **call it at the top of every page/drawer/shared component**. Records are mutated in place then persisted with `save(col, obj, quiet)` / `remove(col, id)` exactly like the prototype. Also: `role()`, `isOwner()`, `isFranchisee()`, `rescope()`, `prop/owner/partner(id)`, `tenantOf`, `actor()`, `side()`, `frFull`, `scopeProps()`, `inScope()`, `frScope()`, `unread()`, `toast(msg)`, `emit()`, `openDrawer(d)`, `closeDrawer()`, `drawDrawer()`, `zoom(src, vid)`, `go(route)`, `openProp(id, tab)`, `openConv(pid)`, `setRoleView(v)`, `previewOwner(id)`, `previewPartner(id)`, `setFilt(group, patch)`. |
| Shared actions | `src/store/actions.js` | `openInv, newInvoice(d), openTicket, newTicket(pid), openLease, editLease, newLease(pid), viewOwnerProfile, editOwner, newOwner, newProperty, editProperty, openInsp, openSite, startExit(id), newInsp(leaseId, kind), runAct({act,...})` |
| Domain logic | `src/domain/` | `utils.js` (inr, fmtD, fmtDT, perLabel, perAdd, addDays, addMonths, daysTo, fy, by, num, newId, nowISO, TODAY, CUR, ordinal, toCsv…), `constants.js` (every list/table from the prototype), `lease.js` (leaseOf, schedule, schedRow, rentFor, nextEsc, lockEnd, noticeBy, rentStartOf, leaseState, calc, invState, rentCell, slaDue, slaBreached, frontOf, occStatus, rentStatus, repairStatus, criticalEvents, maskAcct, fmtAddr, noticeAddrOf, bankState, ledTypes, fyStart, fyList, ledgerEntries, scheduleCsv, ledgerCsv, statementCsv, clearSchedCache), `inspection.js` (saveInsp, inspOf, buildInspection, inspProblems, inspLocked, inspSummary, inspFinalise, inspAttention, inspReport), `site.js` (spaceStd, spaceReq, spaceStatus, earthPlan, catchIndex, CATCH_MAX, reqLoc, reqOf, siteLoc, isFr, siteStage, siteScore, siteProblems, rentPsf, saveSite, slog, reqState, frLetter, siteReport), `documents.js` (invDocHTML, invoiceHTML), `attention.js` (attentionItems). **Import these — never re-implement them.** If you need a helper that does not exist, add it inside your own feature folder. |
| Files | `src/services/files.js` | `uploadFiles(fileList, max)`, `fileUrl`, `isVid`, `isImg`, `offerDownload(filename, text)`, `videoMeta(file)` |
| Seed data | `src/data/seed.js` | ids: owners `o1–o7`, properties `p1–p7` (`p7` = franchise, partner `pa2`), leases `l1–l7`, invoices `i101…`, tickets `t1–t6`, messages `m1–m6`, inspection `in1`, sites `s1–s7`, reqs `r1–r9`, partners `pa1, pa2` |
| Shell | `src/components/app/` | `AppShell` (rail, top bar, phone tab bar, More sheet, role switch), `DrawerLayout` (title, sub, footer, children), `Overlays` (DrawerHost, ToastHost, Lightbox), `Banners` (`SampleBanner` = prototype `banner()`, `PreviewBanner` = `previewBanner()`) |
| Registries | `src/features/pages.jsx`, `src/features/drawers.js` | route → page, drawer kind → component. Already wired to every stub file. |

## Global reusable components — use these everywhere

`src/components/ui/Layout.jsx`: `Btn` (props `primary`, `danger`, `ghost`, `sm`; = prototype `.btn`), `ActLink` (prototype `<a href="#" data-act>`), `PageHead` (title, sub, actions = `head()`), `Panel` (title, sub, actions, body=false for flush tables, id), `Banner` (tone="bad"), `Empty` (panel), `Kpis`/`Kpi` (label, value, sub, alert), `Facts` (items: [label, node][]), `Stack`, `Cols` (n=2|3, = `.grid2/.grid3`), `TableCard` (MUI Table in a bordered card; `maxHeight`, `className`), `ClickRow` (clickable `<tr>`).

`src/components/ui/Status.jsx`: `StatusChip` (label, k), `PriChip` (p), `Badge`, `Legend`, `Ring` (pct, k), `Progress` (pct), `Steps` (steps, stage), `Timeline` (entries: {text, by, at, extra, meta}), `Seg` (options [value,label,kind][], value, onChange — `.seg` buttons), `ConfirmButton` (two-click delete).

`src/components/ui/Media.jsx`: `Facade` (name, sub — `facadeSVG`), `Media` (f, alt), `PhotoStrip` (files, empty, onRemove, children = extra tiles), `AddMedia` (onFiles, video, need, label, capture), `FileLinks` (files).

`src/components/form/Fields.jsx` — the 12-column MUI `Grid` form system (half width by default, `full` = 12/12):
`FormGrid`, `Cell`, `SectionTitle` (first), `FieldBox` (label+hint around custom content), `TextInput` (name, label, type, defaultValue | value+onChange, hint, required, full, multiline, placeholder, readOnly, min, max, step, maxLength, inputMode, upper, list, grid=false for bare), `SelectInput` (native select; options value | [value,label]; placeholder adds an empty first option), `CheckField`, `FileInput` (dashed drop with existing files as children).

CSS classes from the prototype are available globally in `src/styles/app.css` (kpis, chip, roll/cell, list/li/when, cards/pcard/ph/pb/ptype/srows/srow, facts, front, photos/vthumb/pwrap/px/addph, drop, file, timeline/tl, thread/msg/chatlayout/convs/conv/composer/crow/attach, steps/step, sched/upfront, locbar/locstats/rcards/rcard, eplan, osec, board/bcol/scard, stagebar/sb, req, catchbars, cmp/bestc, pipe, vids/vslot/script, ibar/prog/ijump/isec/iitem/ihead/prev, sigs/sig/probs, invdoc/calc, empty, gate, copybox, banner, legend, badge, mono/num/muted/small/eyebrow/code/grow/actions/filters). Use them for the bespoke widgets; use MUI (via the components above, MUI `Table*`, `Tabs`/`Tab`, `Grid`, `Box`) for primitives. **Do not** add new global CSS — use `sx` locally.

## Porting rules

1. **Exactness.** Port the prototype function line by line: same texts (including typographic quotes, ₹, ·, —, ×), same order of sections, same conditions (`isOwner()`, `isFranchisee()`, stage checks…), same buttons and what they do, same toasts and validation messages, same computed numbers. If the prototype hides something for owners, hide it. Keep `id`s used as scroll anchors (e.g. `it-<key>`, `isec-<n>`, `ssec-<n>`, `agr-<leaseId>`).
2. **HTML strings → JSX.** `chip(x)` → `<StatusChip label=…/>`, `head()` → `<PageHead/>`, `fld/inp/sel` → `TextInput/SelectInput/FieldBox`, `photoStrip` → `<PhotoStrip/>`, `data-act="x"` → `onClick` calling the ported action. `esc()` is not needed in JSX.
3. **Forms.** Keep them uncontrolled (`name` + `defaultValue`) and read values with `new FormData(form)` in the submit handler — the prototype's `SUBMIT.*` handlers port almost verbatim into `features/<area>/actions.js`. Disable submit buttons while saving. For "submitter" buttons (sign vs dispute, accept vs return, reject vs hold) read `e.nativeEvent.submitter.value`. Live-recalculating forms (lease preview, invoice calc) listen with `onInput`/`onChange` on the `<form>` and re-read `FormData`.
4. **Live-saving drawers** (inspection, site): mutate the record on change and call `saveInsp(I)` / `saveSite(st)`, then `emit()` if the UI must update; use `defaultValue` inputs keyed by record id/field so typing is never clobbered.
5. **Drawer components** receive `({ d })` (the descriptor passed to `openDrawer`) and return `<DrawerLayout title sub footer>…</DrawerLayout>`. When the prototype re-opened a drawer with new params (e.g. invoice form changing property/type/mode), hold those params in `useState` initialised from `d`.
6. **Responsive.** Match the prototype's breakpoints (900px / 760px / 560px). Tables scroll horizontally; forms go single-column on phones (Fields does this).
7. **Ownership.** Only create/edit files inside your assigned folders/files. Shared files (store, domain, components, registries, styles) are read-only for you; if you find a bug there, report it in your final message instead of editing.
8. Do not run `npm install`, do not touch git, do not start another dev server.

## Verifying (do this for every page and drawer — three passes)

The dev server is already running at `http://localhost:5173` (HMR). Both apps accept the same query params:
`role=tdpl|o1…o7|fr:pa1|fr:pa2`, `route=<page>`, `sel=<propertyId>`, `tab=<tab>`, `mode=board|table|compare`, `d=<url-encoded JSON drawer descriptor>`.

```bash
cd /d/Satya-App/Trust-space
tools/shot.sh "http://localhost:5173/?route=invoices" <scratch>/react.png 1400 2400
tools/shot.sh "file:///D:/Satya-App/Trust-space/reference/TruSpace-nav.html?route=invoices" <scratch>/ref.png 1400 2400
# phone width: add 390 1800 as width/height
# console errors:
"/c/Program Files/Google/Chrome/Application/chrome.exe" --headless=new --disable-gpu --user-data-dir="$(mktemp -d)" --enable-logging=stderr --v=0 --virtual-time-budget=6000 --dump-dom "http://localhost:5173/?route=invoices" 2>&1 | grep -i "CONSOLE" | grep -iv "vite\|devtools"
```
Then `Read` both PNGs and compare. Pass 1: structure and every text. Pass 2: re-read the prototype function line by line against your JSX (conditions, roles, numbers, actions, toasts). Pass 3: screenshots at 1400px and 390px for every role that can see the page, plus every drawer state, and zero console errors.
Lint your files: `cd web && npx oxlint src/features/<area>`.
