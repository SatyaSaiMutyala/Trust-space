/* Security-deposit figures come from the API (GET /api/leases/:id/deposit, /api/deposits — computed on the server); refetched
   when a lease, invoice or owner is saved. */
import { api } from '../../app/api'
import { useReport } from '../../app/useReport'

/** { dep: { leaseId, deposit, paid, multi, adjusted, held, owners: [{ ownerId, sharePct, share, adjusted, held, proposed, available }], candidates, settlement } | null, … } */
export function useLeaseDeposit(leaseId) {
  const r = useReport(api.useLeaseDepositQuery, leaseId, !leaseId)
  return { dep: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}

/** { deposits: { held, leases: [{ leaseId, propertyId, deposit, adjusted, held }] } | null, … } */
export function useDeposits() {
  const r = useReport(api.useDepositsQuery, undefined)
  return { deposits: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}
