/* Read a server-computed report through an RTK Query hook: the last result stays on screen while a newer one loads,
   the server's message is announced on error, and the query refetches when records it was tagged with are saved. */
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { errorMessage } from './api'
import { notify } from './slices'

/** useReport(api.useXQuery, arg, skip) → { data: <response data> | null, isFetching, isLoading, error } */
export function useReport(hook, arg, skip = false) {
  const rdx = useDispatch()
  const { data, error, isFetching, isLoading } = hook(arg, { skip, refetchOnMountOrArgChange: 30 })
  useEffect(() => { if (error) rdx(notify(errorMessage(error), 'error')) }, [error, rdx])
  return { data: data?.data || null, isFetching, isLoading, error }
}
