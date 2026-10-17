/* TDS figures come from the API (GET /api/tds/report, /api/tds/owner/:id/f16 — computed on the server); refetched when a
   challan, return, invoice, lease or owner is saved. */
import { api } from '../../app/api'
import { useReport } from '../../app/useReport'

/** { report: { fy, today, fys, entries, rows, quarters, challans } | null, isFetching, isLoading, error } */
export function useTdsReport(fy) {
  const r = useReport(api.useTdsReportQuery, { fy }, !fy)
  return { report: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}

/** { f16: { ownerId, pan, quarters: [{ fy, q, base, tds, issuedOn, file, due }] } | null, … } */
export function useOwnerF16(ownerId) {
  const r = useReport(api.useOwnerF16Query, ownerId, !ownerId)
  return { f16: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}
