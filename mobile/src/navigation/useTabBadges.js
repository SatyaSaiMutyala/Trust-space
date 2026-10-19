/* Live badge counts for the tab bar: unread messages, open repairs, inspections in progress. Reads the same cached
   queries the screens use, so no extra traffic beyond their refreshes. */
import { useAppSelector } from '../store/hooks';
import { useThreadsQuery, useListQuery, useInspectionsQuery } from '../store/api';

const OPEN_TICKETS = ['Open', 'Assigned', 'In progress', 'Awaiting owner'];

export default function useTabBadges() {
  const { status, role } = useAppSelector(st => st.auth);
  const on = status === 'signedIn';
  const threads = useThreadsQuery(undefined, { skip: !on });
  const tickets = useListQuery({ resource: 'tickets', params: { limit: 100 } }, { skip: !on });
  const inspections = useInspectionsQuery(undefined, { skip: !on || role === 'owner' });
  const openTickets = (tickets.data?.data || []).filter(t => OPEN_TICKETS.includes(t.status));
  return {
    messages: threads.data?.data?.unread || 0,
    repairs: role === 'owner' ? openTickets.filter(t => t.status === 'Awaiting owner').length : openTickets.length,
    inspect: inspections.data?.data?.counts ? inspections.data.data.counts.open + inspections.data.data.counts.todo : 0,
  };
}
