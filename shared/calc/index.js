/* TruSpace calculation module — one implementation of the lease, invoice, deposit and TDS maths, used by the web app
   (for instant previews) and the API (as the source of truth). Pure ES modules, no dependencies.
   Tests: `node --test shared/calc/test/` from the repo root. */
export * from './util.js'
export * from './lease.js'
export * from './tds.js'
export * from './site.js'
export * from './inspection.js'
