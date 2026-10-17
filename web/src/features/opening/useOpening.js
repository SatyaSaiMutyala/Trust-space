/* Opening balances come from the API (GET /api/opening — computed on the server); refetched when a lease, invoice or owner
   is saved. The payment drawer's defaults come from GET /api/leases/:id/opening-pay/:itemId. */
import { api } from '../../app/api'
import { useReport } from '../../app/useReport'

/** { opening: { asOf, leases: [{ leaseId, propertyId, ref, entered, confirmed, confirmedOn, items: [{…, out}], total, outstanding }], totals } | null, … } */
export function useOpening() {
  const r = useReport(api.useOpeningQuery, undefined)
  return { opening: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}

/** { pay: { rate, tds, paid, noPan } | null, … } */
export function useOpeningPay(leaseId, itemId) {
  const r = useReport(api.useOpeningPayQuery, { id: leaseId, itemId }, !leaseId || !itemId)
  return { pay: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}
