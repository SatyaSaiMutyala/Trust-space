/* Ledgers, rent roll and rent status come from the API (GET /api/ledgers, /api/rent-roll, /api/rent-status — computed on the
   server); refetched when an invoice, lease, owner or property is saved. */
import { api } from '../../app/api'
import { useReport } from '../../app/useReport'

/** { ledger: { tab, fy, from, fys, opening, rows, totals, recon?, deposits? } | null, isFetching, isLoading } */
export function useLedger(params) {
  const r = useReport(api.useLedgerQuery, params)
  return { ledger: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}

/** { roll: { cur, periods, leases: [{ leaseId, propertyId, state, rentNow, cells }] } | null, … } */
export function useRentRoll(months = 7) {
  const r = useReport(api.useRentRollQuery, { months })
  return { roll: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}

/** { byProperty: { [propertyId]: { v, k, note } } | null, … } */
export function useRentStatus() {
  const r = useReport(api.useRentStatusQuery, undefined)
  return { byProperty: r.data?.byProperty || null, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}
