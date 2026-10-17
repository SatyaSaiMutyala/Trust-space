/* A saved lease's rent schedule comes from the API (GET /api/leases/:id/schedule — computed on the server); refetched when
   the lease or an owner (PAN, TDS certificate) is saved. The lease form's live preview still uses the shared module locally. */
import { api } from '../../app/api'
import { useReport } from '../../app/useReport'

/** { sc: { rows, years, tot, end, owners, upfront, unadjusted } | null, isFetching, isLoading, error } */
export function useLeaseSchedule(leaseId) {
  const r = useReport(api.useLeaseScheduleQuery, leaseId, !leaseId)
  return { sc: r.data, isFetching: r.isFetching, isLoading: r.isLoading, error: r.error }
}
